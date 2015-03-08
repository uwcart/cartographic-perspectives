/********************************************************
Written for Cartographic Perspectives: On the Horizon
Modified from an Interactive Cartography and Geovisualization laboratory exercise given in Spring, 2013
Copyright (c) October 2013, Carl Sack and the University of Wisconsin-Madison Cartography Program
MIT License
**********************************************************/

//global variables
var keyArray = ["varA","varB","varC","varD","varE"];
var expressed = keyArray[0];

window.onload = initialize(); //start script once HTML is loaded

function initialize(){ //the first function called once the html is loaded
	setMap();
};

function setMap(){ //set choropleth map parameters	
	//map frame dimensions
	var width = 960;
	var height = 460;
	
	//optional--create a title for the page
	// var title = d3.select("body")
	// 	.append("h1")
	// 	.text("France Regions Choropleth");
	
	//create a new svg element with the above dimensions
	var map = d3.select("body")
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("class", "map");
	
	//create Europe albers equal area conic projection, centered on France
	var projection = d3.geo.albers()
		.center([-8, 46.2])
		.rotate([-10, 0])
		.parallels([43, 62])
		.scale(2500)
		.translate([width / 2, height / 2]);
	
	//create svg path generator using the projection
	var path = d3.geo.path()
		.projection(projection);

	var graticule = d3.geo.graticule()
		.step([10, 10]); //place graticule lines every 10 degrees of longitude and latitude
	
	//create graticule background
	var gratBackground = map.append("path")
		.datum(graticule.outline) //bind graticule background
		.attr("class", "gratBackground") //assign class for styling
		.attr("d", path) //project graticule
	
	//create graticule lines	
	var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
		.data(graticule.lines) //bind graticule lines to each element to be created
	  	.enter() //create an element for each datum
		.append("path") //append each element to the svg as a path element
		.attr("class", "gratLines") //assign class for styling
		.attr("d", path); //project graticule lines

	queue() //use queue.js to parallelize asynchronous data loading for cpu efficiency
		.defer(d3.csv, "data/unitsData.csv") //load attributes data from csv
		.defer(d3.json, "data/EuropeCountries.topojson") //load geometry from countries topojson
		.defer(d3.json, "data/FranceRegions.topojson") //load geometry from regions topojson
		.await(callback);

	function callback(error, csvData, europeData, franceData){
		
		var recolorMap = colorScale(csvData); //retrieve color scale generator

		//variables for csv to json data transfer
		var jsonRegions = franceData.objects.FranceRegions.geometries;
			
		//loop through csv data to assign each csv region's values to json region properties
		for (var i=0; i<csvData.length; i++) {		
			var csvRegion = csvData[i]; //the current region's attributes
			var csvAdm1 = csvRegion.adm1_code; //adm1 code
			
			//loop through json regions to assign csv data to the right region
			for (var a=0; a<jsonRegions.length; a++){
				
				//where adm1 codes match, attach csv data to json object
				if (jsonRegions[a].properties.adm1_code == csvAdm1){
					
					//one more for loop to assign all key/value pairs to json object
					for (var key in keyArray){
						var attr = keyArray[key];
						var val = parseFloat(csvRegion[attr]);
						jsonRegions[a].properties[attr] = val;
					};
					
					jsonRegions[a].properties.name = csvRegion.name; //set prop
					break; //stop looking through the json regions
				};
			};
		};

		//add Europe countries geometry to map			
		var countries = map.append("path") //create SVG path element
			.datum(topojson.feature(europeData, europeData.objects.EuropeCountries)) //bind countries data to path element
			.attr("class", "countries") //assign class for styling countries
			.attr("d", path); //project data as geometry in svg

		//add regions to map as enumeration units colored by data
		var regions = map.selectAll(".regions")
			.data(topojson.feature(franceData, franceData.objects.FranceRegions).features) //bind regions data to path element
			.enter() //create elements
			.append("path") //append elements to svg
			.attr("class", "regions") //assign class for additional styling
			.attr("id", function(d) { return d.properties.adm1_code })
			.attr("d", path) //project data as geometry in svg
			.style("fill", function(d) { //color enumeration units
				return choropleth(d, recolorMap);
			})
			.on("mouseover", highlight)
			.on("mouseout", dehighlight)
			.on("mousemove", moveLabel)
			.append("desc") //append the current color
				.text(function(d) {
					return choropleth(d, recolorMap);
				});

		createDropdown(csvData); //create the dropdown menu

	};
};

function createDropdown(csvData){
	//add a select element for the dropdown menu
	var dropdown = d3.select("body")
		.append("div")
		.attr("class","dropdown") //for positioning menu with css
		.html("<h3>Select Variable:</h3>")
		.append("select")
		.on("change", function(){ changeAttribute(this.value, csvData) }); //changes expressed attribute
	
	//create each option element within the dropdown
	dropdown.selectAll("options")
		.data(keyArray)
		.enter()
		.append("option")
		.attr("value", function(d){ return d })
		.text(function(d) {
			d = d[0].toUpperCase() + d.substring(1,3) + " " + d.substring(3);
			return d
		});
};

function colorScale(csvData){

	//create quantile classes with color scale		
	var color = d3.scale.quantile() //designate quantile scale generator
		.range([
			"#D4B9DA",
			"#C994C7",
			"#DF65B0",
			"#DD1C77",
			"#980043"
		]);
	
	//build array of all currently expressed values for input domain
	var domainArray = [];
	for (var i in csvData){
		domainArray.push(Number(csvData[i][expressed]));
	};
	
	//for equal-interval scale, use min and max expressed data values as domain
	// color.domain([
	// 	d3.min(csvData, function(d) { return Number(d[expressed]); }),
	// 	d3.max(csvData, function(d) { return Number(d[expressed]); })
	// ]);

	//for quantile scale, pass array of expressed values as domain
	color.domain(domainArray);
	
	return color; //return the color scale generator
};

function choropleth(d, recolorMap){
	
	//get data value
	var value = d.properties[expressed];
	//if value exists, assign it a color; otherwise assign gray
	if (value) {
		return recolorMap(value); //recolorMap holds the colorScale generator
	} else {
		return "#ccc";
	};
};

function changeAttribute(attribute, csvData){
	//change the expressed attribute
	expressed = attribute;
	
	//recolor the map
	d3.selectAll(".regions") //select every region
		.style("fill", function(d) { //color enumeration units
			return choropleth(d, colorScale(csvData)); //->
		})
		.select("desc") //replace the color text in each region's desc element
			.text(function(d) {
				return choropleth(d, colorScale(csvData)); //->
			});
};

function format(value){
	
	//format the value's display according to the attribute
	if (expressed != "Population"){
		value = "$"+roundRight(value);
	} else {
		value = roundRight(value);
	};
	
	return value;
};

function roundRight(number){
	
	if (number>=100){
		var num = Math.round(number);
		return num.toLocaleString();
	} else if (number<100 && number>=10){
		return number.toPrecision(4);
	} else if (number<10 && number>=1){
		return number.toPrecision(3);
	} else if (number<1){
		return number.toPrecision(2);
	};
};

function highlight(data){
	
	var props = data.properties; //json properties

	d3.select("#"+props.adm1_code) //select the current region in the DOM
		.style("fill", "#000"); //set the enumeration unit fill to black

	var labelAttribute = "<h1>"+props[expressed]+
		"</h1><br><b>"+expressed+"</b>"; //label content
	var labelName = props.name //html string for name to go in child div
	
	//create info label div
	var infolabel = d3.select("body")
		.append("div") //create the label div
		.attr("class", "infolabel")
		.attr("id", props.adm1_code+"label") //for styling label
		.html(labelAttribute) //add text
		.append("div") //add child div for feature name
		.attr("class", "labelname") //for styling name
		.html(labelName); //add feature name to label
};

function dehighlight(data){
	
	var props = data.properties; //json properties
	var region = d3.select("#"+props.adm1_code); //select the current region
	var fillcolor = region.select("desc").text(); //access original color from desc
	region.style("fill", fillcolor); //reset enumeration unit to orginal color
	
	d3.select("#"+props.adm1_code+"label").remove(); //remove info label
};

function moveLabel() {
	
	var x = d3.event.clientX+10; //horizontal label coordinate based mouse position stored in d3.event
	var y = d3.event.clientY-75; //vertical label coordinate
	d3.select(".infolabel") //select the label div for moving
		.style("margin-left", x+"px") //reposition label horizontal
		.style("margin-top", y+"px"); //reposition label vertical
};
