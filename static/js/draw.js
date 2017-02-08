var width = 500,
height = 480
// var margin = {top: 40, right: 80, bottom: 40, left: 120};

var screen_resolution = window.screen.availWidth;
if (screen_resolution <= 480){
    width = 310
    height = 350
	var radius = Math.min(width, height) / 2
	innerRadius = 0.45 * radius;
} else {
	var radius = Math.min(width, height) / 2
	innerRadius = 0.33 * radius;
}


// Width of wedges
var pie = d3.layout.pie()
.sort(null)
.value(function(d) { return 4;} );

// HoverText
var tip = d3.tip()
.attr('class', 'd3-tip')
.offset([0, 0])
.html(function(d) {
	if (municipalities_data.hasOwnProperty(d.data.label)) {
		return capitalizeFirstLetter(municipalities_data[d.data.label][language]) + ": <span style='color:red'><b>" + d.data.value + "%</b></span>";
	} else {
		return capitalizeFirstLetter(indicators_data[d.data.label][language]) + ": <span style='color:red'><b>" + d.data.value + "%</b></span>";
	}
});

// Calculate fill
var arc = d3.svg.arc()
.innerRadius(innerRadius)
.outerRadius(function (d) { 
	return (radius - innerRadius) * (d.data.value / 100.0) + innerRadius; 
});

var outlineArc = d3.svg.arc()
.innerRadius(innerRadius)
.outerRadius(radius);

// Import Data
function start(muni, s_or_d, div, data, sort_by, language, type, s_or_d) {
	convert_data(data, muni, div, sort_by, language, type, s_or_d);
};

// Convert data from JSON to required format
function convert_data(data, muni, div, sort_by, language, type, s_or_d) {
	//Select data for municipality
	muni_data = data;
	
	//Loop through and convert to required format	
	var json_array = []
	for (var key in muni_data) {
		if (!(isNaN(muni_data[key]))){
			var json = {
				"label": key,
				"value": Number(muni_data[key].toFixed(1))
			}
			json_array.push(json);
		}
	};
	
	// Sort data by the label
	var sorted_data = sortByKey(json_array, sort_by);
	create(sorted_data.reverse(), div, language, type, s_or_d);
}

function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

function slugify(text) {
	if (text != undefined){
	  return text.toString().toLowerCase()
	    .replace(/\s+/g, '-')           // Replace spaces with -
	    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
	    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
	    .replace(/^-+/, '')             // Trim - from start of text
	    .replace(/-+$/, '');            // Trim - from end of text
	}
}


// Create chart
function create(data, div, language, type, s_or_d) {
	wedge_color = s_or_d_colors[s_or_d];
	types = {
		"municipality": municipalities_data,
		"kosovo-level": indicators_data
	}

	$("#" + div).empty();
	window.svg = d3.select("#" + div).append("svg")
	.attr("id", "aster-chart-svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
	.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
	svg.call(tip);

	// Background
	var outerPath = svg.selectAll(".outlineArc")
	.data(pie(data))
	.enter().append("path")
	.attr("fill", d3.rgb(bg_color))
	.attr("stroke", d3.rgb(line_color))
	.attr("class", "outlineArc")
    .transition().delay(function (d,i){ return i * 30;})
	.attr("d", outlineArc);


	// Wedges
	var path = svg.selectAll(".solidArc")
	.data(pie(data))
	.enter()
	.append("g")

	path
	.append("path")
	.attr("fill", d3.rgb(wedge_color))
  	.style("fill-rule", "evenodd")
	.attr("class", "solidArc")
	.attr("id", function(d) { return slugify(d.data.label); })
	.attr("value", function(d) { return d.data.label; })
	.attr("stroke", d3.rgb(line_color))
	.attr("d", arc)
	.on('click', select_wedge)
	.on('mouseover', tip.show)
	.on('mouseout', tip.hide)
    .each(stash);

  	// Append Text Labels 
  	if (screen_resolution > 480){
	  	path.append("svg:text")
	    .text(function(d) {
	    	if (types[type].hasOwnProperty(d.data.label)) {
	    		if (types[type][d.data.label].hasOwnProperty([language + "_short"])){
	    			return capitalizeFirstLetter(reduceIndicatorsText(types[type][d.data.label][language + "_short"]));
	    		} else {
	    			return capitalizeFirstLetter(reduceIndicatorsText(types[type][d.data.label][language]));
	    		}
	    	} else {
	    		return capitalizeFirstLetter(reduceIndicatorsText(d.data.label));
	    	}
	    })
	    .classed("label", true)
		.attr("class", "aster-labels")
	    .attr("x", function(d) {return (d.x); })
		// Set anchor based on which side of the circle text is on
	    .attr("text-anchor", function(d) {
			var anchor = "start"
	    	if (outlineArc.centroid(d)[0] > 0) {anchor = "end"} 
			return anchor
	    })
		.attr("fill", "white")
		.style("font-size", "13px;")
	    // Move to the desired point and set the rotation
	    .attr("transform", function(d) {
	            return "translate(" + (outlineArc.centroid(d)) + ")" +
	                   "rotate(" + getAngle(d) + ")";
	    })
		// Align text to outside border
	    .attr("dx", function(d) {
			var adjustment = "-70"
	    	if (outlineArc.centroid(d)[0] > 0) {adjustment = "70"} 
			return adjustment
		})
	    .attr("dy", ".35em") // vertical-align
	    .attr("pointer-events", "none");
	}
};

function getAngle(d) {
    // Offset the angle by 90 deg since the '0' degree axis for arc is Y axis, while
    // for text it is the X axis.
    var thetaDeg = (180 / Math.PI * (arc.startAngle()(d) + arc.endAngle()(d)) / 2 - 90);
    // If we are rotating the text by more than 90 deg, then "flip" it.
    // This is why "text-anchor", "middle" is important, otherwise, this "flip" would
    // a little harder.
    return (thetaDeg > 90) ? thetaDeg - 180 : thetaDeg;
}

// Stash the old values for transition.
function stash(d) {
  d.x0 = d.x;
  d.dx0 = d.dx;
}

// Interpolate the arcs in data space.
function arcTween(a) {
  var i = d3.interpolate({x: a.x0, dx: a.dx0}, a);
  return function(t) {
    var b = i(t);
    a.x0 = b.x;
    a.dx0 = b.dx;
    return arc(b);
  };
}

function capitalizeFirstLetter(string) {
	if (string != undefined){
		return String(string).charAt(0).toUpperCase() + string.slice(1);
	}
}

// What happens when a wedge is clicked
function select_wedge(d){
	// Remove old text

	$( ".aster-score" ).each(function(){
		$(this).remove();
	})
	// for(var i = 0, l = spans.length; i < l; i++){
	// 	console.log(spans[i])
	//     spans[i].remove()
	// }
	// $('g').last().find(".aster-score").remove();
	// svg.selectAll("text").remove();
	
	//Reset Colors
	svg.selectAll(".solidArc")
	.attr("fill", d3.rgb(wedge_color))
	.attr("stroke", d3.rgb(line_color))
	.attr("stroke-width", "1");
	
	// Text placed in the middle
	if (municipalities_data.hasOwnProperty(d.data.label)) {
		var fulltext = capitalizeFirstLetter(municipalities_data[d.data.label][language]) + " " + d.data.value + "%";
	} else {
		var fulltext = capitalizeFirstLetter(indicators_data[d.data.label][language]) + " " + d.data.value + "%";
	}
	addDescriptionToAsterChart(d, fulltext, svg);
	
	//Color selected wedge
	d3.select(this)
	.attr("fill", d3.rgb(select_color))
	.attr("stroke", d3.rgb(line_color))
	.attr("stroke-width", "1");
};

function reduceIndicatorsText(text){
	if (text.length > 21){
		return text.substring(0, 21) + "...";	
	} else {
		return text;
	}
}

// Adds description in the middle of the aster chart and regulates the size of text.
function addDescriptionToAsterChart(d, fulltext, svg){
	var json_position = {
		0: -38,
		1: -18,
		2: 2,
		3: 22,
		4: 42,
		5: 62,
	}
	var a = "";
	if (fulltext.length > 11){
		a = fulltext.match(/.{6}\S*|.*/g);	
	} else if (fulltext.length == 8) {
		a = fulltext.match(/.{4}\S*|.*/g);	
	} else if (fulltext.length == 9) {
		a = fulltext.match(/.{3}\S*|.*/g);	
	} else if (fulltext.length == 10) {
		a = fulltext.match(/.{4}\S*|.*/g);	
	} else {
		a = fulltext.match(/.{5}\S*|.*/g);	
	}
	var index = 0;
	if (a.length <= 2) {
		index = 2;
	} else if (a.length == 3) {
		index = 1;
	} else if (a.length >= 4 && a.length <= 5) {
		index = 1;
	} else {
		index = 0;
	}

	var r = /\d+/;
	// alert (s.match(r));
	a.forEach(function(entry) {
		if (entry.match(r)){
			var text = svg.append("svg:text")
			.attr("class", "aster-score")
			.attr("dy", json_position[index])
			.attr("text-anchor", "middle")
			.style("font-size", "16px")
			// .style("fill", "red")
			.style("font-weight", "bold")
			.text(entry);
		} else {
			svg.append("svg:text")
			.attr("class", "aster-score")
			.attr("dy", json_position[index])
			.attr("text-anchor", "middle")
			.text(entry);	
		}
		index = index + 1;
	});
	// $(".aster-score-percentage").css("color", "red")
}