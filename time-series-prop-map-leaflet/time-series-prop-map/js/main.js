$(document).ready(function() {

	var cities;
	var map = L.map('map', {
			center: [37.8, -96],
			zoom: 4,
			minZoom: 4
		});

	L.tileLayer(
		'http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap Contributors</a>'
	}).addTo(map);

	$.getJSON("data/city-data.json")
		.done(function(data) {

			var info = processData(data);
			createPropSymbols(info.timestamps, data);
			createLegend(info.min,info.max);
			createSliderUI(info.timestamps);

		})
		.fail(function() { alert("There has been a problem loading the data.")});

	function processData(data) {

		var timestamps = [];
		var	min = Infinity;
		var	max = -Infinity;

		for (var feature in data.features) {

			var properties = data.features[feature].properties;

			for (var attribute in properties) {

				if ( attribute != 'id' &&
					 attribute != 'name' &&
					 attribute != 'lat' &&
					 attribute != 'lon' )
				{
					if ( $.inArray(attribute,timestamps) ===  -1) {
						timestamps.push(attribute);
					}
					if (properties[attribute] < min) {
						min = properties[attribute];
					}
					if (properties[attribute] > max) {
						max = properties[attribute];
					}
				}
			}
		}
		return {
			timestamps : timestamps,
			min : min,
			max : max
		}
	}  // end processData()

	function createPropSymbols(timestamps, data) {

		cities = L.geoJson(data, {

			pointToLayer: function(feature, latlng) {

				return L.circleMarker(latlng, {

				    fillColor: "#708598",
				    color: '#537898',
				    weight: 1,
				    fillOpacity: 0.6

				}).on({

					mouseover: function(e) {
						this.openPopup();
						this.setStyle({color: 'yellow'});
					},
					mouseout: function(e) {
						this.closePopup();
						this.setStyle({color: '#537898'});

					}
				});
			}
		}).addTo(map);

		updatePropSymbols(timestamps[0]);

	} // end createPropSymbols()

	function updatePropSymbols(timestamp) {

		cities.eachLayer(function(layer) {

			var props = layer.feature.properties;
			var	radius = calcPropRadius(props[timestamp]);
			var	popupContent = "<b>" + String(props[timestamp]) + " units</b><br>" +
							   "<i>" + props.name +
							   "</i> in </i>" + timestamp + "</i>";

			layer.setRadius(radius);
			layer.bindPopup(popupContent, { offset: new L.Point(0,-radius) });

		});
	} // end updatePropSymbols

	function calcPropRadius(attributeValue) {

		var scaleFactor = 48,
			area = attributeValue * scaleFactor;

		return Math.sqrt(area/Math.PI);

	} // end calcPropRadius

	function createLegend(min, max) {

		if (min < 10) {
			min = 10;
		}

		function roundNumber(inNumber) {

       		return (Math.round(inNumber/10) * 10);
		}

		var legend = L.control( { position: 'bottomright' } );

		legend.onAdd = function(map) {

			var legendContainer = L.DomUtil.create("div", "legend");
			var	symbolsContainer = L.DomUtil.create("div", "symbolsContainer");
			var	classes = [roundNumber(min), roundNumber((max-min)/2), roundNumber(max)];
			var	legendCircle;
			var	lastRadius = 0;
			var  currentRadius;
			var  margin;

			L.DomEvent.addListener(legendContainer, 'mousedown', function(e) {
				L.DomEvent.stopPropagation(e);
			});

			$(legendContainer).append("<h2 id='legendTitle'># of somethings</h2>");

			for (var i = 0; i <= classes.length-1; i++) {

				legendCircle = L.DomUtil.create("div", "legendCircle");

				currentRadius = calcPropRadius(classes[i]);

				margin = -currentRadius - lastRadius - 2;

				$(legendCircle).attr("style", "width: " + currentRadius*2 +
					"px; height: " + currentRadius*2 +
					"px; margin-left: " + margin + "px" );

				$(legendCircle).append("<span class='legendValue'>"+classes[i]+"<span>");

				$(symbolsContainer).append(legendCircle);

				lastRadius = currentRadius;

			}

			$(legendContainer).append(symbolsContainer);

			return legendContainer;

		};

		legend.addTo(map);
	} // end createLegend()
	
	function createSliderUI(timestamps) {

		var sliderControl = L.control({ position: 'bottomleft'} );

		sliderControl.onAdd = function(map) {

			var slider = L.DomUtil.create("input", "range-slider");

			L.DomEvent.addListener(slider, 'mousedown', function(e) {

				L.DomEvent.stopPropagation(e);

			});

			$(slider)
				.attr({'type':'range', 'max': 6, 'min': 0, 'step': 1,'value': 0})
		        .on('input change', function() {
		        	updatePropSymbols(timestamps[$(this).val()]);
		            $(".temporal-legend").text(timestamps[this.value]);
		        });

			return slider;
		}

		sliderControl.addTo(map);
		createTemporalLegend(timestamps[0]);
	} // end createSliderUI()

	function createTemporalLegend(startTimestamp) {

		var temporalLegend = L.control({ position: 'bottomleft' });

		temporalLegend.onAdd = function(map) {

			var output = L.DomUtil.create("output", "temporal-legend");

			return output;
		}

		temporalLegend.addTo(map);
		$(".temporal-legend").text(startTimestamp);
	}	// end createTemporalLegend()
});
