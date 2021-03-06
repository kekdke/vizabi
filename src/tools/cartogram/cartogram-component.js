import * as utils from 'base/utils';
import Component from 'base/component';
import Labels from 'helpers/labels';
import {
  warn as iconWarn,
  question as iconQuestion
} from 'base/iconset';

import topojson from 'helpers/topojson';
import d3_geo_projection from 'helpers/d3.geo.projection';
import DynamicBackground from 'helpers/d3.dynamicBackground';

//import Selectlist from './bubblemap-selectlist';

//BUBBLE MAP CHART COMPONENT
var CartogramComponent = Component.extend({
  /**
   * Initializes the component (Bubble Map Chart).
   * Executed once before any template is rendered.
   * @param {Object} config The config passed to the component
   * @param {Object} context The component's parent
   */
  init: function (config, context) {
    this.name = 'cartogram';
    this.template = 'cartogram.html';


    //http://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
    var mobileAndTabletcheck = function() {
      var check = false;
      (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
      return check;
    };
    this.isMobile = mobileAndTabletcheck();

    //define expected models for this component
    this.model_expects = [{
      name: "time",
      type: "time"
    }, {
      name: "entities",
      type: "entities"
    }, {
      name: "marker",
      type: "model"
    }, {
      name: "language",
      type: "language"
    }, {
      name: "ui",
      type: "model"
    }];

    var _this = this;
    this.model_binds = {
      "change:time.value": function (evt) {
        if (!_this._readyOnce) return;
        _this.year.setText(_this.model.time.timeFormat(_this.model.time.value));
        if (!_this.calculationQueue) { // collect timestamp that we request
          _this.calculationQueue = [_this.model.time.value.toString()]
        } else {
          _this.calculationQueue.push(_this.model.time.value.toString());
        }
        (function(time) { // isolate timestamp
          _this.model.marker.getFrame(time, function(frame, time) {
            var index = _this.calculationQueue.indexOf(time.toString()); //
            if (index == -1) { // we was receive more recent frame before so we pass this frame
              return;
            } else {
              _this.calculationQueue.splice(0, index + 1); // remove timestamps that added to queue before current timestamp
            }
            _this.frameChanged(frame, time);
          });

        }(_this.model.time.value));
      },
      'change:marker.size.extent': function(evt, path) {
        //console.log("EVENT change:marker:size:max");
        if(!_this._readyOnce) return;
        _this.updateMarkerSizeLimits();
        _this.updateEntities();
      },
      "change:marker.color.scaleType": function(evt, path) {
        _this.updateIndicators();
        _this.updateEntitityColor();
      },
      
      'change:marker.size.use': function(evt, path) {
        _this.model.ui.chart.lockActive = _this.model.marker.size.use != "constant";
      },
      "change:marker.color.palette": function(evt, path) {
        _this.updateEntitityColor();
      },
      "change:ui.chart.lockNonSelected": function(evt) {
        _this.updateEntities(900);
      },
      "change:entities.select": function() {
        if(!_this._readyOnce) return;
        _this.updateLandOpacity();
      },
      "change:entities.highlight": function() {
        if(!_this._readyOnce) return;
        //console.log("EVENT change:entities:highlight");
        _this.updateLandOpacity();
      },
      'change:entities.opacitySelectDim': function() {
        _this.updateLandOpacity();
      },
      'change:entities.opacityRegular': function() {
        _this.updateLandOpacity();
      },
    };
    //this._selectlist = new Selectlist(this);

    //contructor is the same as any component
    this._super(config, context);


    _this.COLOR_LAND_DEFAULT = "#fdfdfd";

    this.lands = null;
    this.features = null;
    this.topo_features = null;
    this.borderArcs = null;
    this.defaultWidth = 700;
    this.defaultHeight = 550;
    this.updateEntitiesQueue = [];
    this.boundBox = [[0.05, 0.0], [0.95, 1.0]]; // two points to set box bound on 960 * 500 image;
    d3_geo_projection();
    this.cached = [];
    this.projection = d3.geo.mercator()
      .center([25, -29])
      .scale(1900)
      .translate([this.defaultWidth / 2, this.defaultHeight / 2])
      .precision(.1);

    this.cartogram = d3.cartogram()
      .projection(this.projection)
      .properties(function(d) {
        return d.properties;
      });

    this._labels = new Labels(this);
    this._labels.config({
      CSS_PREFIX: 'vzb-ct',
      LABELS_CONTAINER_CLASS: 'vzb-ct-labels',
      LINES_CONTAINER_CLASS: 'vzb-ct-lines'
    });

  },

  afterPreload: function(){
    var _this = this;
    if(!this.world) utils.warn("cartogram afterPreload: missing country shapes " + this.world);
    if(!this.geometries) utils.warn("cartogram afterPreload: missing country shapes " + this.geometries);

    // http://bl.ocks.org/mbostock/d4021aa4dccfd65edffd patterson
    // http://bl.ocks.org/mbostock/3710566 robinson
    // map background

    this.borderArcs = _this.cartogram.meshArcs(this.world, this.world.objects.topo, function(a, b) {
      return a.properties.MN_NAME && a.properties.PR_NAME !== b.properties.PR_NAME;
    });

  },
  _getKey: function(d) {
    return d.properties[this.id_lookup]? d.properties[this.id_lookup].toString() : d.id.toString(); 
  },
  /**
   * DOM is ready
   */
  readyOnce: function () {

    this.element = d3.select(this.element);

    this.graph = this.element.select('.vzb-ct-graph');
    this.mapSvg = this.element.select('.vzb-ct-map-background');

    this.labelsContainerCrop = this.graph.select('.vzb-ct-labels-crop');
    this.labelsContainer = this.graph.select('.vzb-ct-labels');

    this.yTitleEl = this.graph.select(".vzb-ct-axis-y-title");
    this.sTitleEl = this.graph.select(".vzb-ct-axis-c-title");
    this.yInfoEl = this.graph.select(".vzb-ct-axis-y-info");
    this.sInfoEl = this.graph.select(".vzb-ct-axis-c-info");
    this.dataWarningEl = this.graph.select(".vzb-data-warning");
    this.entityBubbles = null;
    this.tooltip = this.element.select('.vzb-ct-tooltip');

    // year background
    this.yearEl = this.graph.select('.vzb-ct-year');
    this.year = new DynamicBackground(this.yearEl);
    this.year.setConditions({xAlign: 'left', yAlign: 'bottom', bottomOffset: 5});
    this.mapGraph = this.element.select(".vzb-ct-map-graph")
      .attr("width", this.defaultWidth)
      .attr("height", this.defaultHeight);
    this.mapGraph.html('');


    this.KEY = this.model.entities.getDimension();
    this.TIMEDIM = this.model.time.getDimension();

    var _this = this;
    this.updateUIStrings();
    this.on("resize", function() {
      if(_this.updateSize()) return;
    });
    this.wScale = d3.scale.linear()
      .domain(this.parent.datawarning_content.doubtDomain)
      .range(this.parent.datawarning_content.doubtRange);

    this.cartogram.iterations(0);
    this.redrawInProgress = true;

    this.cartogram(this.world, this.geometries).then(function(response) {
      _this.redrawInProgress = false;

      _this.features = _this.topo_features = response.features;
      _this.lands = _this.mapGraph.selectAll(".land")
        .data(_this.topo_features)
        .enter().append("path")
        .attr("class", function(d) { return "land " + (d.properties[_this.id_lookup]?d.properties[_this.id_lookup]:d.id); })
        .attr("d", _this.cartogram.path)
        .on("mouseover", function (d, i) {
          if (utils.isTouchDevice()) return;
          _this._interact()._mouseover(d, i);
        })
        .on("mouseout", function (d, i) {
          if (utils.isTouchDevice()) return;
          _this._interact()._mouseout(d, i);
        })
        .on("click", function(d, i) {
          if(utils.isTouchDevice()) return;
          _this._interact()._click(d, i);
        })
        .each(function(d) {
          d[_this.KEY] = _this._getKey(d);
        });

      if (_this.borderArcs) {
        var data = _this.cartogram.stitchArcs(response, _this.borderArcs);
        _this.borders = _this.mapGraph.append("path")
          .datum(data)
          .attr("class", "boundary")
          .attr("d", _this.cartogram.path);
      }
    });
  },
  
  frameChanged: function(frame, time) {
    if (time.toString() != this.model.time.value.toString()) return; // frame is outdated
    if (!frame) return;
    this.values = frame;
    this.updateTime();
    this.updateTitleNumbers();
    this.updateEntities(this.duration);
  },
  
  /*
   * Both model and DOM are ready
   */
  ready: function () {
    var _this = this;
    this.cached = [];
    this.updateIndicators();
    this.updateUIStrings();
    this.updateMarkerSizeLimits();
    this.updateSize();
    this.model.marker.getFrame(_this.model.time.value, _this.frameChanged.bind(_this));
    this.year.setText(_this.model.time.timeFormat(_this.model.time.value));
  },

  /**
   * Changes labels for indicators
   */
  updateIndicators: function () {
    this.sScale = this.model.marker.size.getScale();
    this.cScale = this.model.marker.color.getScale();
  },

  updateMarkerSizeLimits: function() {
    var _this = this;
    var extent = this.model.marker.size.extent || [0,1];
    this.minRadius = Math.max(100 * extent[0], 0);
    this.maxRadius = Math.max(100 * extent[1], 0);

    this.sScale.domain([0, this.sScale.domain()[1]]);
    if(this.model.marker.size.scaleType !== "ordinal") {
      this.sScale.range([this.minRadius, this.maxRadius]);
    } else {
      this.sScale.rangePoints([this.minRadius, this.maxRadius], 0).range();
    }
  },
  
  _calculateTotalSize: function(year, frame) {
    if (this.cached[year]) {
      return this.cached[year];
    }
    var _this = this;
    this.cached[year] = 0;
    utils.forEach(frame, function(val) {
      _this.cached[year] += _this.sScale(val);
    });
    return this.cached[year];
  },
   
  _redrawEntities: function() {
    var _this = this;
    if (this.updateEntitiesQueue.length == 0) return;
    if (this.redrawInProgress) {
      setTimeout(function() {
        _this._redrawEntities();
      }, 100);
      return;
    }
    this.redrawInProgress = true;
    var time = this.updateEntitiesQueue[this.updateEntitiesQueue.length - 1].time;
    var duration = this.updateEntitiesQueue[this.updateEntitiesQueue.length - 1].duration;
    this.updateEntitiesQueue = [];
    if(this.model.ui.chart.lockNonSelected) {
      time = this.model.time.timeFormat.parse("" + this.model.ui.chart.lockNonSelected);
    }
    this.model.marker.getFrame(time, function(lockedFrame) {
      var totValue = null;
      if (_this.model.marker.size.use == "constant") {
        _this.cartogram.iterations(0);
      } else {
        _this.cartogram.iterations(8);
        //var areas = _this.topo_features.map(d3.geo.path().projection(null).area);
        _this.cartogram.value(function(d) {
          if (_this.model.ui.chart.lockNonSelected) {
            var size1 = _this.sScale(lockedFrame.size[_this._getKey(d)])/* * _this._calculateTotalSize(_this.model.time.value, _this.values.size)*/,
              size2 = _this.sScale(_this.values.size[_this._getKey(d)])/* * _this._calculateTotalSize(time, lockedFrame.size)*/;
            return d3.geo.path().projection(null).area(d) * Math.pow((size2 / size1), 2);  
          } else {
            return _this.sScale(_this.values.size[_this._getKey(d)]);
          }
        });
        /*
         if (_this.model.ui.chart.lockNonSelected) {
         totValue = d3.sum(areas);
         }
         */
      }
      var calcDuration = 0;
      var start = new Date().getTime();
      _this.cartogram(_this.world, _this.geometries, totValue).then(function(response) {
        var end = new Date().getTime();
        if (duration) { // increale duration for prevent gaps between frames
          duration = Math.max(duration, end - start);
        }
        _this.features = response.features;
        if (_this.borderArcs) {
          var data = _this.cartogram.stitchArcs(response, _this.borderArcs);
          _this.borders.datum(data)
            .transition()
            .duration(duration)
            .ease("linear")
            .attr("d", _this.cartogram.path);
        }
        _this.lands.data(_this.features)
          .each(function(d) {
            d[_this.KEY] = _this._getKey(d);
          });
        if (duration) {
          _this.lands.interrupt()
            .transition()
            .duration(duration)
            .ease("linear")
            .style("fill", function(d) {
              return _this.values.color[_this._getKey(d)]!=null?_this.cScale(_this.values.color[_this._getKey(d)]):_this.COLOR_LAND_DEFAULT;
            })
            .attr("d", _this.cartogram.path);
          if (_this.borderArcs) {
            _this.borders.interrupt()
              .transition()
              .duration(duration)
              .ease("linear")
              .attr("d", _this.cartogram.path);
          }

        } else {
          _this.borders
            .attr("d", _this.cartogram.path);

          _this.lands
            .style("fill", function(d) {
              return _this.values.color[_this._getKey(d)]!=null?_this.cScale(_this.values.color[_this._getKey(d)]):_this.COLOR_LAND_DEFAULT;
            })
            .attr("d", _this.cartogram.path);

        }
        _this.updateLandOpacity();
        _this.redrawInProgress = false;
        _this._redrawEntities();
      });
    });
  },
    
  updateEntities: function(duration) {
    var time = this.model.time.value;
    
    this.updateEntitiesQueue.push({time:time, duration: duration});
    this._redrawEntities();
  },

  updateEntitityColor: function() {
    var _this = this;
    this.lands.transition()
      .duration(_this.duration)
      .ease("linear")
      .style("fill", function(d) {
        return _this.values.color[_this._getKey(d)]!=null?_this.cScale(_this.values.color[_this._getKey(d)]):_this.COLOR_LAND_DEFAULT;
      })
    
  },
  updateUIStrings: function () {
    var _this = this;

    this.translator = this.model.language.getTFunction();
    var sizeConceptprops = this.model.marker.size.getConceptprops();
    this.strings = {
      title: {
        C: (_this.model.marker.size.use !== "constant"? this.translator("buttons/color") + ": " : "") + this.translator("indicator/" + _this.model.marker.color.which),
        S: this.translator("buttons/size") + ": " + this.translator("indicator/" + _this.model.marker.size.which)
      }
    };
    
    this.yTitleEl.select("text")
      //don't show "Color:" when the size is constant and we are only showing color
      .text(this.strings.title.C)
      .on("click", function() {
        _this.parent
          .findChildByName("gapminder-treemenu")
          .markerID("color")
          .alignX("left")
          .alignY("top")
          .updateView()
          .toggle();
      });

    this.sTitleEl.select("text")
      .text(this.strings.title.S)
      .on("click", function() {
        _this.parent
          .findChildByName("gapminder-treemenu")
          .markerID("size")
          .alignX("left")
          .alignY("top")
          .updateView()
          .toggle();
      });

    utils.setIcon(this.dataWarningEl, iconWarn).select("svg").attr("width", "0px").attr("height", "0px");
    this.dataWarningEl.append("text")
      .attr("text-anchor", "end")
      .text(this.translator("hints/dataWarning"));

    this.dataWarningEl
      .on("click", function () {
        _this.parent.findChildByName("gapminder-datawarning").toggle();
      })
      .on("mouseover", function () {
        _this.updateDoubtOpacity(1);
      })
      .on("mouseout", function () {
        _this.updateDoubtOpacity();
      })

    this.yInfoEl
      .html(iconQuestion)
      .select("svg").attr("width", "0px").attr("height", "0px");

    //TODO: move away from UI strings, maybe to ready or ready once
    this.yInfoEl.on("click", function() {
      _this.parent.findChildByName("gapminder-datanotes").pin();
    })
    this.yInfoEl.on("mouseover", function() {
      var rect = this.getBBox();
      var coord = utils.makeAbsoluteContext(this, this.farthestViewportElement)(rect.x - 10, rect.y + rect.height + 10);
      _this.parent.findChildByName("gapminder-datanotes").setHook('size').show().setPos(coord.x, coord.y);
    })
    this.yInfoEl.on("mouseout", function() {
      _this.parent.findChildByName("gapminder-datanotes").hide();
    })

    this.sInfoEl
      .html(iconQuestion)
      .select("svg").attr("width", "0px").attr("height", "0px");

    //TODO: move away from UI strings, maybe to ready or ready once
    this.sInfoEl.on("click", function() {
      _this.parent.findChildByName("gapminder-datanotes").pin();
    })
    this.sInfoEl.on("mouseover", function() {
      var rect = this.getBBox();
      var coord = utils.makeAbsoluteContext(this, this.farthestViewportElement)(rect.x - 10, rect.y + rect.height + 10);
      _this.parent.findChildByName("gapminder-datanotes").setHook('color').show().setPos(coord.x, coord.y);
    })
    this.sInfoEl.on("mouseout", function() {
      _this.parent.findChildByName("gapminder-datanotes").hide();
    })
  },

  updateDoubtOpacity: function (opacity) {
    if (opacity == null) opacity = this.wScale(+this.time.getUTCFullYear().toString());
    if (this.someSelected) opacity = 1;
    this.dataWarningEl.style("opacity", opacity);
  },

  /*
   * UPDATE TIME:
   * Ideally should only update when time or data changes
   */
  updateTime: function() {
    var _this = this;
    this.time_1 = this.time == null ? this.model.time.value : this.time;
    this.time = this.model.time.value;
    this.duration = this.model.time.playing && (this.time - this.time_1 > 0) ? this.model.time.delayAnimations : 0;

    //possibly update the exact value in size title
  },


  /**
   * Executes everytime the container or vizabi is resized
   * Ideally,it contains only operations related to size
   */
  updateSize: function () {

    var _this = this;
    var margin, infoElHeight;

    var profiles = {
      small: {
        margin: { top: 10, right: 10, left: 10, bottom: 0 },
        infoElHeight: 16,
      },
      medium: {
        margin: { top: 20, right: 20, left: 20, bottom: 30 },
        infoElHeight: 20,
      },
      large: {
        margin: { top: 30, right: 30, left: 30, bottom: 35 },
        infoElHeight: 22,
      }
    };

    var presentationProfileChanges = {
      medium: {
        infoElHeight: 26
      },
      large: {
        infoElHeight: 32
      }
    };

    this.activeProfile = this.getActiveProfile(profiles, presentationProfileChanges);
    margin = this.activeProfile.margin;
    infoElHeight = this.activeProfile.infoElHeight;

    //stage
    var height = this.height = (parseInt(this.element.style("height"), 10) - margin.top - margin.bottom) || 0;
    var width = this.width = (parseInt(this.element.style("width"), 10) - margin.left - margin.right) || 0;

    if(this.height<=0 || this.width<=0) return utils.warn("Bubble map updateSize() abort: vizabi container is too little or has display:none");

    var boundBox = this.boundBox;
    var viewBox = [ boundBox[0][0] * this.defaultWidth,
      boundBox[0][1] * this.defaultHeight,
      Math.abs(boundBox[1][0] - boundBox[0][0]) * this.defaultWidth,
      Math.abs(boundBox[1][1] - boundBox[0][1]) * this.defaultHeight];

    this.graph
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    this.year.resize(this.width, this.height,
      Math.min(this.width/2.5, Math.max(this.height / 4, this.width / 4)) / 2.5);

    this.mapSvg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', viewBox.join(' '))
      .attr('preserveAspectRatio', 'xMidYMid')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .style("transform", "translate3d(" + margin.left + "px," + margin.top + "px,0)");

    this.yTitleEl
      .style("font-size", infoElHeight)
      .attr("transform", "translate(0," + margin.top + ")")

    var yTitleBB = this.yTitleEl.select("text").node().getBBox();

    this.sTitleEl.attr("transform", "translate(" + 0 + "," + (margin.top + yTitleBB.height) + ")")
      .classed("vzb-hidden", this.model.marker.size.use == "constant");

    var warnBB = this.dataWarningEl.select("text").node().getBBox();
    this.dataWarningEl.select("svg")
      .attr("width", warnBB.height * 0.75)
      .attr("height", warnBB.height * 0.75)
      .attr("x", -warnBB.width - warnBB.height * 1.2)
      .attr("y", -warnBB.height * 0.65)

    this.dataWarningEl
      .attr("transform", "translate(" + (this.width) + "," + (this.height - warnBB.height * 0.5) + ")")
      .select("text");

    if(this.yInfoEl.select('svg').node()) {
      var titleBBox = this.yTitleEl.node().getBBox();
      var translate = d3.transform(this.yTitleEl.attr('transform')).translate;

      this.yInfoEl.select('svg')
        .attr("width", infoElHeight)
        .attr("height", infoElHeight)
      this.yInfoEl.attr('transform', 'translate('
        + (titleBBox.x + translate[0] + titleBBox.width + infoElHeight * .4) + ','
        + (translate[1] - infoElHeight * 0.8) + ')');
    }

    this.sInfoEl.classed("vzb-hidden", this.sTitleEl.classed("vzb-hidden"));

    if(!this.sInfoEl.classed("vzb-hidden") && this.sInfoEl.select('svg').node()) {
      var titleBBox = this.sTitleEl.node().getBBox();
      var translate = d3.transform(this.sTitleEl.attr('transform')).translate;

      this.sInfoEl.select('svg')
        .attr("width", infoElHeight)
        .attr("height", infoElHeight)
      this.sInfoEl.attr('transform', 'translate('
        + (titleBBox.x + translate[0] + titleBBox.width + infoElHeight * .4) + ','
        + (translate[1] - infoElHeight * 0.8) + ')');
    }
  },

  fitSizeOfTitles: function(){

    //reset font sizes first to make the measurement consistent
    var yTitleText = this.yTitleEl.select("text")
      .style("font-size", null);
    var sTitleText = this.sTitleEl.select("text")
      .style("font-size", null);


    var yTitleBB = yTitleText.node().getBBox();
    var sTitleBB = this.sTitleEl.classed('vzb-hidden') ? yTitleBB : sTitleText.node().getBBox();

    var font =
      Math.max(parseInt(yTitleText.style("font-size")), parseInt(sTitleText.style("font-size")))
      * this.width / Math.max(yTitleBB.width, sTitleBB.width);

    if(Math.max(yTitleBB.width, sTitleBB.width) > this.width) {
      yTitleText.style("font-size", font + "px");
      sTitleText.style("font-size", font + "px");
    } else {
      // Else - reset the font size to default so it won't get stuck
      yTitleText.style("font-size", null);
      sTitleText.style("font-size", null);
    }
  },
  _interact: function () {
    var _this = this;

    return {
      _mouseover: function (d, i) {
        if (_this.model.time.dragging) return;

        _this.model.entities.highlightEntity(d);

        _this.hovered = d;
        //put the exact value in the size title
        _this.updateTitleNumbers();
        _this.fitSizeOfTitles();

        if (_this.model.entities.isSelected(d)) { // if selected, not show hover tooltip
          _this._setTooltip();
        } else {
          //position tooltip
          _this._setTooltip(d);
        }
      },
      _mouseout: function (d, i) {
        if (_this.model.time.dragging) return;
        _this._setTooltip();
        _this.hovered = null;
        _this.updateTitleNumbers();
        _this.fitSizeOfTitles();
        _this.model.entities.clearHighlighted();
      },
      _click: function (d, i) {
        _this.model.entities.selectEntity(d);
      }
    };

  },

  // show size number on title when hovered on a bubble
  updateTitleNumbers: function(){
    var _this = this;

    var mobile; // if is mobile device and only one bubble is selected, update the ytitle for the bubble
    if (_this.isMobile && _this.model.entities.select && _this.model.entities.select.length === 1) {
      mobile = _this.model.entities.select[0];
    }

    if(_this.hovered || mobile) {
      var hovered = _this.hovered || mobile;
      var formatterC = _this.model.marker.color.getTickFormatter();

      var unitC = _this.translator("unit/" + _this.model.marker.color.which);
      //suppress unit strings that found no translation (returns same thing as requested)
      if(unitC === "unit/" + _this.model.marker.color.which) unitC = "";
      
      var valueC = _this.values.color[_this._getKey(hovered)];
      _this.yTitleEl.select("text")
        .text(this.strings.title.C + ": " +
        (valueC || valueC===0 ? formatterC(valueC) + " " + unitC : _this.translator("hints/nodata")));

      if (this.model.marker.size.use !== "constant") {
        var formatterS = _this.model.marker.size.getTickFormatter();
        
        var unitS = _this.translator("unit/" + _this.model.marker.size.which);
        //suppress unit strings that found no translation (returns same thing as requested)
        if(unitS === "unit/" + _this.model.marker.size.which) unitS = "";
        
        var valueS = _this.values.size[_this._getKey(hovered)];
        _this.sTitleEl.select("text")
          .text(this.strings.title.S + ": " + formatterS(valueS) + " " + unitS);
      }

      this.yInfoEl.classed("vzb-hidden", true);
      this.sInfoEl.classed("vzb-hidden", true);
    } else {
      this.yTitleEl.select("text")
        .text(this.strings.title.C);
      this.sTitleEl.select("text")
        .text(this.strings.title.S);

      this.yInfoEl.classed("vzb-hidden", false);
      this.sInfoEl.classed("vzb-hidden", false);
    }
  },
  
  _setTooltip: function (d) {
    var _this = this;
    if (d) {
      var tooltipText = this.values.label[this._getKey(d)]?
        this.values.label[this._getKey(d)]
        :d.properties.MN_NAME;
      var offset = 10;
      var mouse = d3.mouse(this.graph.node()).map(function(d) {
        return parseInt(d)
      });
      var x = mouse[0];
      var y = mouse[1];
      var xPos, yPos, xSign = -1,
        ySign = -1,
        xOffset = 0,
        yOffset = 0;

      if(offset) {
        xOffset = offset * .71; // .71 - sin and cos for 315
        yOffset = offset * .71;
      }
      //position tooltip
      this.tooltip.classed("vzb-hidden", false)
        //.attr("style", "left:" + (mouse[0] + 50) + "px;top:" + (mouse[1] + 50) + "px")
        .selectAll("text")
        .text(tooltipText);

      var contentBBox = this.tooltip.select('text')[0][0].getBBox();
      if(x - xOffset - contentBBox.width < 0) {
        xSign = 1;
        x += contentBBox.width + 5; // corrective to the block Radius and text padding
      } else {
        x -= 5; // corrective to the block Radius and text padding
      }
      if(y - yOffset - contentBBox.height < 0) {
        ySign = 1;
        y += contentBBox.height;
      } else {
        y -= 11; // corrective to the block Radius and text padding
      }
      if(offset) {
        xPos = x + xOffset * xSign;
        yPos = y + yOffset * ySign; // 5 and 11 - corrective to the block Radius and text padding
      } else {
        xPos = x + xOffset * xSign; // .71 - sin and cos for 315
        yPos = y + yOffset * ySign; // 5 and 11 - corrective to the block Radius and text padding
      }
      this.tooltip.attr("transform", "translate(" + (xPos ? xPos : mouse[0]) + "," + (yPos ? yPos : mouse[1]) +
        ")")

      this.tooltip.select('rect').attr("width", contentBBox.width + 8)
        .attr("height", contentBBox.height * 1.2)
        .attr("x", -contentBBox.width - 4)
        .attr("y", -contentBBox.height * .85)
        .attr("rx", contentBBox.height * .2)
        .attr("ry", contentBBox.height * .2);


    } else {

      this.tooltip.classed("vzb-hidden", true);
    }
  },
  
  updateLandOpacity: function() {
    var _this = this;
    //if(!duration)duration = 0;

    var OPACITY_HIGHLT = 0.8;
    var OPACITY_HIGHLT_DIM = .3;
    var OPACITY_SELECT = this.model.entities.opacityRegular;
    var OPACITY_REGULAR = this.model.entities.opacityRegular;
    var OPACITY_SELECT_DIM = this.model.entities.opacitySelectDim;
    this.someHighlighted = (this.model.entities.highlight.length > 0);
    this.someSelected = (this.model.entities.select.length > 0);
    this.lands
      .style("opacity", function(d) {

        if(_this.someHighlighted) {
          //highlight or non-highlight
          if(_this.model.entities.isHighlighted(d)) return OPACITY_HIGHLT;
        }

        if(_this.someSelected) {
          //selected or non-selected
          return _this.model.entities.isSelected(d) ? OPACITY_SELECT : OPACITY_SELECT_DIM;
        }

        if(_this.someHighlighted) return OPACITY_HIGHLT_DIM;

        return OPACITY_REGULAR;
      });


    var someSelectedAndOpacityZero = _this.someSelected && _this.model.entities.opacitySelectDim < .01;

    // when pointer events need update...
    if(someSelectedAndOpacityZero != this.someSelectedAndOpacityZero_1) {
      this.lands.style("pointer-events", function(d) {
        return(!someSelectedAndOpacityZero || _this.model.entities.isSelected(d)) ?
          "visible" : "none";
      });
    }

    this.someSelectedAndOpacityZero_1 = _this.someSelected && _this.model.entities.opacitySelectDim < .01;
  }


});


export default CartogramComponent;