Highcharts.ajax({
    url: 'https://cdn.jsdelivr.net/gh/highcharts/highcharts@v7.0.0/samples/data/world-population-history.csv',
    dataType: 'csv',
    success: function (csv) {


        // Very simple and case-specific CSV string splitting
        function CSVtoArray(text) {
            return text.replace(/^"/, '')
                .replace(/",$/, '')
                .split('","');
        }

        csv = csv.split(/\n/);

        var countries = {},
            mapChart,
            countryChart,
            numRegex = /^[0-9\.]+$/,
            lastCommaRegex = /,\s$/,
            quoteRegex = /\"/g,
            categories = CSVtoArray(csv[2]).slice(4);

        // Parse the CSV into arrays, one array each country
        csv.slice(3).forEach(function (line) {
            var row = CSVtoArray(line),
                data = row.slice(4);

            data.forEach(function (val, i) {
                val = val.replace(quoteRegex, '');
                if (numRegex.test(val)) {
                    val = parseInt(val, 10);
                } else if (!val || lastCommaRegex.test(val)) {
                    val = null;
                }
                data[i] = val;
            });

            countries[row[1]] = {
                name: row[0],
                code3: row[1],
                data: data
            };
        });

        // For each country, use the latest value for current population
        var data = [];
        for (var code3 in countries) {
            if (Object.hasOwnProperty.call(countries, code3)) {
                var value = null,
                    year,
                    itemData = countries[code3].data,
                    i = itemData.length;

                while (i--) {
                    if (typeof itemData[i] === 'number') {
                        value = itemData[i];
                        year = categories[i];
                        break;
                    }
                }
                data.push({
                    name: countries[code3].name,
                    code3: code3,
                    value: value,
                    year: year
                });
            }
        }

        // Add lower case codes to the data set for inclusion in the tooltip.pointFormat
        var mapData = Highcharts.geojson(Highcharts.maps['custom/world']);
        mapData.forEach(function (country) {
            country.id = country.properties['hc-key']; // for Chart.get()
            country.flag = country.id.replace('UK', 'GB').toLowerCase();
        });

        // Initiate the map chart
        mapChart = Highcharts.mapChart('container', {

            title: {
                text: 'Population history by country'
            },

            subtitle: {
                text: 'Source: <a href="http://data.worldbank.org/indicator/SP.POP.TOTL/countries/1W?display=default">The World Bank</a>'
            },

            mapNavigation: {
                enabled: true,
                buttonOptions: {
                    verticalAlign: 'bottom'
                }
            },

            colorAxis: {
                type: 'logarithmic',
                endOnTick: false,
                startOnTick: false,
                min: 50000
            },

            tooltip: {
                footerFormat: '<span style="font-size: 10px">(Click for details)</span>'
            },

            series: [{
                data: data,
                mapData: mapData,
                joinBy: ['iso-a3', 'code3'],
                name: 'Current population',
                allowPointSelect: true,
                cursor: 'pointer',
                states: {
                    select: {
                        color: '#a4edba',
                        borderColor: 'black',
                        dashStyle: 'shortdot'
                    }
                },
                borderWidth: 0.5
            }],
            plotOptions: {
                series: {
                    point: {
                        events: {
                            click: function () {
                                byCountry(this.name);
                                liveByCountryAndStatusAfterDate(this.name);
                            }
                        }
                    }
                }
            }
        });
    }
});

function byCountry(country) {
    xhttp = new XMLHttpRequest();
    xhttp.open("GET", "https://api.covid19api.com/country/" + country + "/status/confirmed/live?from=2021-05-01T00:00:00Z&to=2021-05-13T00:00:00Z", true);
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var json = JSON.parse(this.responseText);
            var dataPoints = [];
            for (var index = 0; index < json.length; index++) {
                dataPoints.push({
                    y: json[index].Cases,
                    label: json[index].Date.split('T')[0]
                }
                );
            }
            updateLineChart(dataPoints);
        }
    };
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send();
}

function worldTotalWIP() {
    var date = new Date();
    date.setDate(date.getDate() - 1);
    xhttp = new XMLHttpRequest();
    xhttp.open("GET", "https://api.covid19api.com/world/total", true);
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var json = JSON.parse(this.responseText);
            var dataPoints = [];
            dataPoints.push({
                y: json.TotalConfirmed,
                label: 'Confirmed'
            });
            dataPoints.push({
                y: json.TotalDeaths,
                label: 'Deaths'
            });
            dataPoints.push({
                y: json.TotalRecovered,
                label: 'Recovered'
            });
            updatePieChart(dataPoints);
        }
    };
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send();
}

function liveByCountryAndStatusAfterDate(country) {
    var date = new Date();
    date.setDate(date.getDate() - 1);
    xhttp = new XMLHttpRequest();
    xhttp.open("GET", "https://api.covid19api.com/live/country/" + country+"/status/confirmed/date/" + date.toISOString(), true);
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var json = JSON.parse(this.responseText);
            var dataConfirmed =[];
            var dataRecovered =[];
            var dataActive =[];
            var dataDeaths =[];
            for (var index = 0; index < json.length; index++) {
                dataConfirmed.push({
                    y: json[index].Confirmed,
                    label: json[index].Province
                });
                dataRecovered.push({
                    y: json[index].Recovered,
                    label: json[index].Province
                });
                dataActive.push({
                    y: json[index].Active,
                    label: json[index].Province
                });
                dataDeaths.push({
                    y: json[index].Deaths,
                    label: json[index].Province
                });
            }
            updateStackedChart(dataConfirmed, dataRecovered, dataActive, dataDeaths);
        }
    };
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send();
}


function updateLineChart(data) {
    var chart = new CanvasJS.Chart("lineChart", {
        animationEnabled: true,
        title:{
            text: "Confirmed Cases Graph Year 2021",
            fontFamily: "open sans",
            fontColor: "#303030"
        },
        data: [{
            type: "line",
            indexLabelFontSize: 6,
            dataPoints: data
        }],
        axisX: {
            labelAngle: -60,
        },
    });
    chart.render();
}

function updatePieChart(data) {
    var chart = new CanvasJS.Chart("pieChart", {
        animationEnabled: true,
        title:{
            text: "Worldwide Cases Status",
            fontFamily: "open sans",
            fontColor: "#303030"
        },
        data: [{
            type: "pie",
            startAngle: 0,
            dataPoints: data
        }]
    });
    chart.render();
}

function updateStackedChart(dataConfirmed, dataRecovered, dataActive, dataDeaths){
    var chart = new CanvasJS.Chart("stackedChart", {
        animationEnabled: true,
        title:{
            text: "Covid Cases Status Province Wise",
            fontFamily: "open sans",
            fontColor: "#303030"
        },
        
        data: [{
            type: "stackedColumn",
            showInLegend: true,
            color: "#009E9E",
            name: "Confirmed",
            dataPoints: dataConfirmed
            },
            {        
                type: "stackedColumn",
                showInLegend: true,
                name: "Recovered",
                color: "#009B55",
                dataPoints: dataRecovered
            },
            {        
                type: "stackedColumn",
                showInLegend: true,
                name: "Active",
                color: "#EDC500",
                dataPoints: dataActive
            },
            {        
                type: "stackedColumn",
                showInLegend: true,
                name: "Deaths",
                color: "#DB0000",
                dataPoints: dataDeaths
        }]
    });
    chart.render();
}

window.onload = function () {
    worldTotalWIP();
    byCountry('pakistan');
    liveByCountryAndStatusAfterDate('pakistan');
}
