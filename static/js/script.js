
function capitalizeFirstLetter(string) {
    if (string != undefined){
        return String(string).charAt(0).toUpperCase() + string.slice(1);
    }
}

var indicators_data = getindicatorsData();
var sData = getSData();
var dData = getDData();
var all_data = {s: sData,
				d: dData};
var municipalities_data = getmunicipalitiesData();
// Load Problem Data
var problems_data = getProblemsData();
var problems_lang = getProblemsTranslation();

// Color palette
/*
#FF4949 red
#71CE53 green
#C07BD3 purple
#5892DA blue
#FFDE3A yellow
#3D4237 black
*/

// Aster Chart Colors
var bg_color = "#3D4237",
line_color = "#000000"
select_color = "#FFDE3A";

// Satisfied/Dissatisfied Colors
var s_or_d_colors = {
    "s": "#71CE53",
    "d": "#FF4949"
}

var municipality_profile = {
    "albanian": "Profili i komunës",
    "serbian": "Profil opštine",
    "english": "Municipality profile"
}

var s_or_d_percentage = {
    "albanian": {
        "s": "Niveli i kënaqshmërisë",
        "d": "Niveli i pakënaqshmërisë"
    },
    "serbian": {
        "s": "Nivo zadovoljstva",
        "d": "Nivo nezadovoljstva"
    },
    "english": {
        "s": "Satisfaction Level",
        "d": "Dissatisfaction Level"
    }
}

var biggest_problems = {
    "albanian": "Cilat janë problemet më të mëdha?",
    "serbian": "Koji su najveći problemi?",
    "english": "What are the biggest problems?"
}

var line_chart_json = {
    "albanian": "Përqindja e të anketuarve (%)",
    "serbian": "Procenat ispitanika (%)",
    "english": "Proportion of respondents (%)"
}

String.prototype.capitalize = function() {
    return this.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
};

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function drawMap(indicator, s_or_d, data, color){
    var muni_data = [];
    for (key in data){
        var name = key;
        var value = data[key][indicator];
        if (!(isNaN(value))){
            if (value.toString().length > 4){
                value = value.toFixed(1);
            }
            var json_key = {
                "hc-key": "kv-" + slugify(name),
                "value": value
            };
            muni_data.push(json_key);
        }
    }

    for (var key in data){
        indexes = $.map(Highcharts.maps["countries/kv/kv-all"]['features'], function(obj, index) {
            if(obj['properties']['name'] == key) {
                return index;
            }
        })
        firstIndex = indexes[0]
        if (firstIndex != undefined){
            Highcharts.maps["countries/kv/kv-all"]['features'][firstIndex]['properties']['name'] = municipalities_data[key][language];
        }
    }
    // Initiate the chart
    $('#container').highcharts('Map', {
        title : {
            text : ''
        },

        mapNavigation: {
            enabled: true,
            buttonOptions: {
                verticalAlign: 'top'
            },
            enableMouseWheelZoom: false
        },
        colorAxis: {
            min: 0,
            max: 100,
            maxColor: color
        },
        chart: {
            style: {
                fontFamily: 'Exo, corbel',
                fontSize: "10px;"
            }
        },
        plotOptions: {
            enabled: true,
            series: {
                cursor: 'pointer',
                point: {
                    events: {
                        select: function () {
                            $('#popup-button').click();
                            var muni = capitalizeFirstLetter(this['hc-key'].replace("kv-", ""));
                            if (muni.match("-")){
                                muni = muni.replaceAll("-", " ").capitalize();
                            }
                            var display_name = this.name;
                            var ranking = $('input[name=ranking-radio]:checked').val();
                            var sat_or_diss = $('input[name=toggle]:checked').val();
                            generateYearsButtons(sat_or_diss, muni);
                            radiobtn_s_or_d = document.getElementById(sat_or_diss);
                            radiobtn_s_or_d.click();
                            var viti = $('input[name=radio]:checked').val();
                            radiobtn_viti = document.getElementById("year-" + viti);
                            radiobtn_viti.click();
                            $('.modal-title').empty();
                            $('.modal-title').append(municipality_profile[language] + ": <b>" + display_name + "</b>");
                            var aster_div = "aster-chart-popup";
                            var indicator = $("#indicator-select").val();
                            var year = $('input[name=years-popup]:checked').val();
                            window.s_or_d = $('input[name=s_or_d]:checked').val();
                            $("#s_or_d_percentage_popup").empty();
                            $("#s_or_d_percentage_popup").text(s_or_d_percentage[language][s_or_d]);
                            changeRadioButtonsColor(s_or_d)
                            $("#no-data").css("display", "none");
                            start(muni, "S", aster_div, all_data[s_or_d][viti][muni], "label", language, "kosovo-level", s_or_d);

                            onAsterChartClick(muni, s_or_d);
                            $("#aster-chart-popup").find("#" + slugify(indicator)).d3Click();
                            drawColumnChart("column-chart", problems_data, muni);
                            drawLineChart("line-chart", indicator, muni, s_or_d);

                            $('input[name=years-popup]:radio').change(function () {
                                onRadioChange (muni, aster_div)
                            })

                            $('input[name=s_or_d]:radio').change(function () {
                                onRadioChange (muni, aster_div)
                            })

                        }
                    }
                }
            }
        },
        tooltip: {
            backgroundColor: "#FCFFC5",
            fontSize: "17px",
            valueSuffix: "%"
        },

        series : [{
            data : muni_data,
            mapData: Highcharts.maps['countries/kv/kv-all'],
            joinBy: 'hc-key',
            allowPointSelect: true,
            name: capitalizeFirstLetter(indicators_data[indicator][language]),
            dataLabels: {
                enabled: true,
                format: '{point.name}',
                style: {
                    fontFamily: 'Exo, corbel',
                    fontSize: "10px;"
                }
            }
        }]
    });
}

function generateYearsButtons(s_or_d, muni) {
    $("#years-popup-div").empty();
    for (var key in all_data[s_or_d]) {
        var is_NaN = checkIfValueIsNaN(all_data[s_or_d][key][muni]);
        if(is_NaN == 1){
            var radio_button = "<input type='radio' name='years-popup' id='year-"+key+"' value='"+key+"' class='toggle'><label for='year-"+key+"' class='btn'>"+key+"</label>";
            $("#years-popup-div").append(radio_button);
        }
    }
}

function checkIfValueIsNaN(json){
    for (var key in json){
        if (!(isNaN(json[key]))){
            return 1
        }
        else {
            return 0
        }
    }
}

function onRadioChange (muni, aster_div) {
    window.s_or_d = $('input[name=s_or_d]:checked').val();
    $("#s_or_d_percentage_popup").empty();
    $("#s_or_d_percentage_popup").text(s_or_d_percentage[language][s_or_d]);
    changeRadioButtonsColor(s_or_d);
    var save_selected_indicator = $("#aster-chart-popup").find("path[fill='#ffde3a']").attr("value");
    var year = $('input[name=years-popup]:checked').val();
    var indicators_array = []
    if (all_data[s_or_d][year] != undefined){
        start(muni, "S", aster_div, all_data[s_or_d][year][muni], "label", language, "kosovo-level", s_or_d);
        for (var key in all_data[s_or_d][year][muni]) {
            indicators_array.push(slugify(key));
        }
    }
   
    if(indicators_array.indexOf(slugify(save_selected_indicator)) >= 0){
        onAsterChartClick(muni, s_or_d)
        $("#aster-chart-popup").find("#" + slugify(save_selected_indicator)).d3Click();
    } else {
        onAsterChartClick(muni, s_or_d)
        $("#aster-chart-popup").find("#municipal-administration").d3Click();
    }
    onAsterChartClick(muni, s_or_d)        
}

function onAsterChartClick (muni, s_or_d) {
	$("#aster-chart-popup").find('.solidArc').click(function(){
		drawColumnChart("column-chart", problems_data, muni);
		selected_indicator = $(this).attr("value");
		drawLineChart("line-chart", selected_indicator, muni, s_or_d);
	})
}

function drawColumnChart(div, data, municipality){
		
	// Get years and categories for Municipality
	var years = Object.keys(data[municipality]);
	var categories = [];
	var colNames = [];
		
	for (var record in years) {
		var year = years[record];

        // replacing the name of columns from englisht to albanian language
		colNames.push(municipalities_data[municipality][language] + " " + year);
		colNames.push(municipalities_data["Kosovo"][language] + " " + year)
			
		for (var cat in data[municipality][year]) {
			categories.push(data[municipality][year][cat]['label']);
		};
		//Get categories for Kosovo
		for (var cat in data['Kosovo'][year]) {
			categories.push(data['Kosovo'][year][cat]['label']);
		};
	};
		
	// Get rid of duplicates
	var uniqueCats = [];
	$.each(categories, function(i, el){
		if($.inArray(el, uniqueCats) === -1) uniqueCats.push(el);
	});
		
	// Create Data for Chart
	series = [];
	var i = 0;
		
	for (cat in uniqueCats) {
		category = uniqueCats[cat];
		data_array = [];
			
		for (record in years) {
			year = years[record];
			found = 0;
			for (cat in data[municipality][year]) {
				if (data[municipality][year][cat]['label'] == category) {
					var value = Number(data[municipality][year][cat]['value']);
					data_array.push(value);
					found = 1;
				}
			} // Municipality Loop
				
			// If the category didn't exist push null
			if (found == 0) {
				data_array.push(null);
			};
				
			found = 0;
				
			for (cat in data['Kosovo'][year]) {
				if (data['Kosovo'][year][cat]['label'] == category) {
					var value = Number(data['Kosovo'][year][cat]['value']);
					data_array.push(value);
					found = 1;
				}
			} // Kosovo Loop
				
			// If the category didn't exist push null
			if (found == 0) {
				data_array.push(null);
			};
				
		} // Year Loop
			
		// Insert data and category into final array
		series[i] = {'data': data_array
		,'name': category}

		i = i + 1
	} // Category Loop

    // replacing the name of series from englisht to albanian language
    for (var item in series) {
        var name = series[item]['name']
        var name_albanian = problems_lang[name][language]
        series[item]['name'] = name_albanian
    }
	// Feed Data to Chart
	$('#' + div).highcharts({
		chart: {
			type: 'column',
            style: {
                fontFamily: 'Exo, corbel',
            }
		},
		title: {
			text: biggest_problems[language]
		},
		xAxis: {
			categories: colNames
		},
		yAxis: {
			min: 0,
			title: {
				text: line_chart_json[language],
			}
		},
		legend: {
			layout: 'horizontal',
			verticalAlign: 'bottom'
		},
		tooltip: {
			headerFormat: '<b>{point.x}</b><br/>',
			shared: true,
			valueSuffix: '%'
		},
		plotOptions: {
			column: {
				stacking: 'normal'
			}
		},
		series: series
	});
}

function drawLineChart(div, indicator, municipality, s_or_d){
	var categories = []
	var json_data = {}
	var data = []
	for (key in all_data[s_or_d]){
		value = all_data[s_or_d][key][municipality][indicator]
		if (value != undefined && !(isNaN(value))){
			categories.push(key);
			if (value.toString().length > 4){
				value = value.toFixed(1);
			}
			data.push(Number(value));
		}
	}

	$('#' + div).highcharts({
		title: {
			text: s_or_d_percentage[language][s_or_d] + " - " + capitalizeFirstLetter(indicators_data[indicator][language]),
			x: -20 //center
		},
        chart: {
            style: {
                fontFamily: 'Exo'
            }
        },
		xAxis: {
			categories: categories
		},
		yAxis: {
			min: 0,
			max: 100,
			title: {
				text: line_chart_json[language]
			},
			plotLines: [{
				value: 0,
				width: 1,
				color: s_or_d_colors[s_or_d]
			}]
		},
		tooltip: {
			valueSuffix: '%'
		},
		legend: {
			enabled: false
		},
		series: [{
			name: municipalities_data[municipality][language],
			data: data
		}]
	});
}

function bindIndicatorSelectBox(year, s_or_d){
	$("#indicator-select").empty();
    var indicators = []
    var html_text = ""
	for (key in all_data[s_or_d][year]["Pristina"]){
        var indicator_lower = key.toLowerCase();
        if (indicator_lower == "cemetery maintenace") { 
            indicator_lower = "cemetery maintenance";
        }
        var indicator = indicators_data[indicator_lower][language];
        indicators.push({"indicator": indicator, "value": indicator_lower});
	}
    var sorted_indicators = sortByKey(indicators, "indicator");
    for (var json in sorted_indicators){
        text = "<option value='"+sorted_indicators[json]["value"]+"'>"+sorted_indicators[json]["indicator"]+"</option>";
        $("#indicator-select").append(text);   
    }
}

jQuery.fn.d3Click = function () {
	this.each(function (i, e) {
		var evt = document.createEvent("MouseEvents");
		evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
		e.dispatchEvent(evt);
	});
};

function bindSelectBoxOnLabelClick(s_or_d){
	$("#aster-chart").find('.solidArc').click(function(){
		selected_indicator = $(this).attr("value");
		$("#indicator-select").val(selected_indicator);
		var viti = $('input[name=radio]:checked').val()
		drawMap(selected_indicator, s_or_d, all_data[s_or_d][viti], s_or_d_colors[s_or_d]);
	})
}

function rankingByMunicipality(year, indicator, muni, aster_div, s_or_d) {
    var ranking = $('input[name=ranking-radio]:checked').val();
	var data = {}
	for (var key in all_data[s_or_d][year]){
		data[key] = all_data[s_or_d][year][key][indicator]
	}
	$("#aster-chart").find("#" + slugify(municipality)).d3Click();
	start(muni, s_or_d, aster_div, data, "value", language, ranking, s_or_d);
	drawMap(indicator, s_or_d, all_data[s_or_d][year], s_or_d_colors[s_or_d]);
	$("#aster-chart").find("path#" + slugify("Kosovo")).d3Click();
}

function buildLandingPageYearsRadioButtons (s_or_d) {
    $("#years-radio").empty();
    for (var key in all_data[s_or_d]) {
        var input_radio = "<input type='radio' class='toggle toggle-left' name='radio' id='"+key+"'' value='"+key+"' checked><label for='"+key+"' class='btn'>"+key+"</label>";
        $("#years-radio").append(input_radio);
    }
    $("#years-radio").append("<br>");
}

$(document).ready(function(){
    $("#column-chart-div").empty();
    $("#line-chart-div").empty();
    if (screen_resolution <= 480){
        $("#column-chart-div").append("<div id='column-chart' style='margin: auto; width: 320px; height: 350px;'></div>");
        $("#line-chart-div").append("<div id='line-chart' style='margin: auto; width: 320px; height: 350px;'></div>");
    } else if (screen_resolution > 480 && screen_resolution < 1200) {
        $("#column-chart-div").append("<div id='column-chart' style='margin: auto; min-width: 310px; max-width: 550px; width: 100%; height: 300px;'></div>");
        $("#line-chart-div").append("<div id='line-chart' style='margin: auto; min-width: 310px; max-width: 550px; width: 100%; height: 300px;'></div>");
    } else {
        $("#column-chart-div").append("<div id='column-chart' style='margin: auto; min-width: 310px; max-width: 550px; width: 100%; height: 300px;'></div>");
        $("#line-chart-div").append("<div id='line-chart' style='margin: auto; min-width: 310px; max-width: 550px; width: 100%; height: 300px;'></div>");
    }
    
    $('body').css('padding-right', '0');
    var ranking = $('input[name=ranking-radio]:checked').val();
	window.s_or_d = $('input[name=toggle]:checked').val();
    $("#s_or_d_percentage").empty();
    $("#s_or_d_percentage").text(s_or_d_percentage[language][s_or_d]);
    buildLandingPageYearsRadioButtons(s_or_d);
	var muni = "Kosovo";
	var viti = $('input[name=radio]:checked').val()
	var aster_div = "aster-chart";
	start(muni, s_or_d, aster_div, all_data[s_or_d][viti][muni], "label", language, ranking, s_or_d);
	bindIndicatorSelectBox(viti, s_or_d);

    $("#download-data").click(function(){
        var url = "../data/zip_data/kosovo-mosaic-data.zip";
        var downloadAttr = "data.zip";
        $('#download-data').prop('href', url);
        $('#download-data').prop('download', downloadAttr);
    })

	bindSelectBoxOnLabelClick(s_or_d);
	$(document).on('click', '#close-popup, #close', function(event) {
        $('myModal').empty();
		var s_or_d = $('input[name=toggle]:checked').val();
        $("#s_or_d_percentage").empty();
        $("#s_or_d_percentage").text(s_or_d_percentage[language][s_or_d]);
		changeRadioButtonsColor(s_or_d)
		var year = $('input[name=radio]:checked').val();
		var indicator = $("#indicator-select").val();
		var ranking_by = $('input[name=ranking-radio]:checked').val();
		bindIndicatorSelectBox(year, s_or_d);
        $("#indicator-select").val(indicator);
        if (ranking_by == "municipality") {
			rankingByMunicipality(year, indicator, muni, aster_div, s_or_d);
        }else {
			$("#" + year).attr("checked");
			bindIndicatorSelectBox(year, s_or_d);
			// draw map chart on year radio button click.
			$("#indicator-select").val(indicator);
			start(muni, s_or_d, aster_div, all_data[s_or_d][year][muni], "label", language, ranking_by, s_or_d);
			drawMap(indicator, s_or_d, all_data[s_or_d][year], s_or_d_colors[s_or_d]);
			$("#aster-chart").find("#" + slugify(indicator)).d3Click();
			bindSelectBoxOnLabelClick(s_or_d);
		}
        $('body').prop('style', null);
	});

	// Variable for switching between satisfied and dissatisfied datasets
	function onRadioButtonChange(){
		window.s_or_d = $('input[name=toggle]:checked').val();
        $("#s_or_d_percentage").empty();
        $("#s_or_d_percentage").text(s_or_d_percentage[language][s_or_d]);
		changeRadioButtonsColor(s_or_d)
		var year = $('input[name=radio]:checked').val();
		var ranking_by = $('input[name=ranking-radio]:checked').val();
		var indicator = $("#indicator-select").val();

		if (ranking_by == "municipality") {
			rankingByMunicipality(year, indicator, muni, aster_div, s_or_d);
		} else {
			start(muni, s_or_d, aster_div, all_data[s_or_d][year]["Kosovo"], "label", language, ranking_by, s_or_d);
			bindSelectBoxOnLabelClick(s_or_d);
			$("#aster-chart").find("path#" + slugify(indicator)).d3Click();
		}
	};

	$("input[name=ranking-radio]:radio").change(function () {
		onRadioButtonChange()
	});

	$("input[name=toggle]:radio").change(function () {
		onRadioButtonChange()
	});

	$("input[name=radio]:radio").change(function () {
		window.s_or_d = $('input[name=toggle]:checked').val();
        $("#s_or_d_percentage").empty();
        $("#s_or_d_percentage").text(s_or_d_percentage[language][s_or_d]);
		changeRadioButtonsColor(s_or_d)
		var ranking_by = $('input[name=ranking-radio]:checked').val();
		var year = $('input[name=radio]:checked').val()
        var save_selected_indicator = $("#indicator-select").val();
        bindIndicatorSelectBox(year, s_or_d);
        var indicators_array = []
        for (var key in all_data[s_or_d][year]["Pristina"]) {
            indicators_array.push(slugify(key));
        }
        var indicator;
        if(indicators_array.indexOf(slugify(save_selected_indicator)) >= 0){
            indicator = save_selected_indicator;
        } else {
            for (first in all_data[s_or_d][year]["Kosovo"]) break;
            indicator = first;
        }
        $("#indicator-select").val(indicator);
        
		if (ranking_by == "municipality") {
			rankingByMunicipality(year, indicator, muni, aster_div, s_or_d);
		} else {
			aster_data = all_data[s_or_d][year][muni];
			indicator_id = indicator.replace("Satisfaction with ", "");
			$("#" + slugify(indicator_id)).d3Click();
			// draw map chart on year radio button click.
			start(muni, s_or_d, aster_div, all_data[s_or_d][year]["Kosovo"], "label", language, ranking_by, s_or_d);
			drawMap(indicator, s_or_d, all_data[s_or_d][year], s_or_d_colors[s_or_d]);

			bindSelectBoxOnLabelClick(s_or_d);
			$("#aster-chart").find("#" + slugify(indicator)).d3Click();
		}
	});

	$("#indicator-select").change(function(){
		window.s_or_d = $('input[name=toggle]:checked').val();
        $("#s_or_d_percentage").empty();
        $("#s_or_d_percentage").text(s_or_d_percentage[language][s_or_d]);
		changeRadioButtonsColor(s_or_d)
		var ranking_by = $('input[name=ranking-radio]:checked').val();
		var indicator = $("#indicator-select").val();
		var year = $('input[name=radio]:checked').val();

		if (ranking_by == "municipality") {
			rankingByMunicipality(year, indicator, muni, aster_div, s_or_d);
		} else {
			drawMap(indicator, s_or_d, all_data[s_or_d][year], s_or_d_colors[s_or_d]);
			$("#aster-chart").find("path#" + slugify(indicator)).d3Click();
			bindSelectBoxOnLabelClick(s_or_d);
		}
	}); 

	var ranking_by = $('input[name=ranking-radio]:checked').val();
	var indicator = $("#indicator-select").val();

	if (ranking_by == "municipality") {
		rankingByMunicipality(viti, indicator, muni, aster_div, s_or_d);
		drawMap(indicator, s_or_d, all_data[s_or_d][viti], s_or_d_colors[s_or_d]);
	} else {
		$("#aster-chart").find("#" + slugify(indicator)).d3Click();
            
		// draw map chart in page load.
		drawMap(indicator, s_or_d, all_data[s_or_d][viti], s_or_d_colors[s_or_d]);
	}

	$('.no-checkedselector').on('change', 'input[type="radio"].toggle', function () {
		if (this.checked) {
			$('input[name="' + this.name + '"].checked').removeClass('checked');
			$(this).addClass('checked');
			$('.toggle-container').addClass('force-update').removeClass('force-update');
		}
	});
	$('.no-checkedselector input[type="radio"].toggle:checked').addClass('checked');
	changeRadioButtonsColor(s_or_d)
})

function changeRadioButtonsColor(s_or_d) {
	if (s_or_d == "s") {
		$('input[type="radio"]').removeClass('toggle-right')
		$('input[type="radio"]').addClass('toggle-left')
	} else {
		$('input[type="radio"]').removeClass('toggle-left')
		$('input[type="radio"]').addClass('toggle-right')
	}
}
