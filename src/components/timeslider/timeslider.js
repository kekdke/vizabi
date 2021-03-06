import * as utils from 'base/utils';
import Component from 'base/component';
import Promise from 'promise';

var precision = 1;

//constants
var class_playing = "vzb-playing";
var class_loading = "vzb-ts-loading";
var class_hide_play = "vzb-ts-hide-play-button";
var class_dragging = "vzb-ts-dragging";
var class_axis_aligned = "vzb-ts-axis-aligned";
var class_show_value = "vzb-ts-show-value";
var class_show_value_when_drag_play = "vzb-ts-show-value-when-drag-play";

//margins for slider
var profiles = {
  small: {
    margin: {
      top: 7,
      right: 15,
      bottom: 10,
      left: 15
    },
    radius: 8,
    label_spacing: 10
  },
  medium: {
    margin: {
      top: 16,
      right: 15,
      bottom: 10,
      left: 15
    },
    radius: 9,
    label_spacing: 12
  },
  large: {
    margin: {
      top: 14,
      right: 15,
      bottom: 10,
      left: 15
    },
    radius: 11,
    label_spacing: 14
  }
};


var presentationProfileChanges = {
  "medium": {
    margin: {
      top: 9
    }
  },
  "large": {
    margin: {
    }
  }
}

var TimeSlider = Component.extend({
  /**
   * Initializes the timeslider.
   * Executed once before any template is rendered.
   * @param model The model passed to the component
   * @param context The component's parent
   */
  init: function(model, context) {

    this.name = "gapminder-timeslider";
    this.template = this.template || "timeslider.html";
    this.prevPosition = null;
    //define expected models/hooks for this component
    this.model_expects = [{
      name: "time",
      type: "time"
    }, {
      name: "entities",
      type: "entities"
    }, {
      name: "marker",
      type: "model"
    }];

    var _this = this;

    //starts as splash if this is the option
    this._splash = model.ui.splash;

    //binds methods to this model
    this.model_binds = {
      'change:time': function(evt, path) {

        //TODO: readyOnce CANNOT be run twice
        if(_this._splash !== _this.model.time.splash) {
          _this._splash = _this.model.time.splash;
          _this.readyOnce();
          _this.ready();
        }

        if(!_this._splash && _this.slide) {

          if((['time.start', 'time.end']).indexOf(path) !== -1) {
            if (!_this.xScale) return;  
            _this.changeLimits();
          }
          _this._optionClasses();
        }
      },
      'change:time.value': function(evt, path) {
        if(!_this._splash && _this.slide) {
          //only set handle position if change is external
          if(!_this.model.time.dragging) _this._setHandle(_this.model.time.playing);
        }
      },
      'change:time.start': function(evt, path) {
        if(!_this._splash && _this.slide) {
          //only set handle position if change is external
          if(!_this.model.time.dragging) _this._setHandle(_this.model.time.playing);
        }
      },
      'change:time.end': function(evt, path) {
        if(!_this._splash && _this.slide) {
          //only set handle position if change is external
          if(!_this.model.time.dragging) _this._setHandle(_this.model.time.playing);
        }
      },
      'change:time.startSelected': function(evt, path) {
        if(!_this._splash && _this.slide) {
          _this.updateSelectedStartLimiter();
        }
      },
      'change:time.endSelected': function(evt, path) {
        if(!_this._splash && _this.slide) {
          _this.updateSelectedEndLimiter();
        }
      },
      'change:entities.select': function(evt, path) {
        _this.setSelectedLimits();
      }
    };

    this.ui = utils.extend({
      show_limits: false,
      show_value: false,
      show_value_when_drag_play: true,
      show_button: true,
      class_axis_aligned: false
    }, model.ui, this.ui);

    // Same constructor as the superclass
    this._super(model, context);

    //defaults
    this.width = 0;
    this.height = 0;

    this.getValueWidth = utils.memoize(this.getValueWidth);
    this._setTime = utils.throttle(this._setTime, 50);
  },

  //template is ready
  readyOnce: function () {

    if(this._splash) return;

    var _this = this;

    //DOM to d3
    //TODO: remove this ugly hack
    this.element = utils.isArray(this.element) ? this.element : d3.select(this.element);
    this.element.classed(class_loading, false);

    //html elements
    this.slider_outer = this.element.select(".vzb-ts-slider");
    this.slider = this.slider_outer.select("g");
    this.axis = this.element.select(".vzb-ts-slider-axis");
    this.select = this.element.select(".vzb-ts-slider-select");
    this.slide = this.element.select(".vzb-ts-slider-slide");
    this.handle = this.slide.select(".vzb-ts-slider-handle");
    this.valueText = this.slide.select('.vzb-ts-slider-value');
    //Scale
    this.xScale = d3.time.scale.utc()
      .clamp(true);

    //Axis
    this.xAxis = d3.svg.axis()
      .orient("bottom")
      .tickSize(0);
    //Value
    this.valueText.attr("text-anchor", "middle").attr("dy", "-0.7em");

    var brushed = _this._getBrushed(),
      brushedEnd = _this._getBrushedEnd();

    //Brush for dragging
    this.brush = d3.svg.brush()
      .x(this.xScale)
      .extent([0, 0])
      .on("brush", function () {
        brushed.call(this);
      })
      .on("brushend", function () {
        brushedEnd.call(this);
      });

    //Slide
    this.slide.call(this.brush);

    this.slider_outer.on("mousewheel", function () {
        //do nothing and dont pass the event on if we are currently dragging the slider
        if(_this.model.time.dragging){
            d3.event.stopPropagation();
            d3.event.preventDefault();
            d3.event.returnValue = false;
            return false;
        }
    });

    this.slide.selectAll(".extent,.resize")
      .remove();

    this._setSelectedLimitsId = 0; //counter for setSelectedLimits
    this._needRecalcSelectedLimits = true;
    
    utils.forEach(_this.model.marker.getSubhooks(), function(hook) {
      if(hook._important) hook.on('change:which', function() {
        _this._needRecalcSelectedLimits = true;
        _this.model.time.startSelected = _this.model.time.start;
        _this.model.time.endSelected = _this.model.time.end; 
      });
    });
    
    this.root.on('ready', function() {     
      if(_this._needRecalcSelectedLimits) {
        _this._needRecalcSelectedLimits = false;
        _this.setSelectedLimits(true);
      }      
    });

    if(this.model.time.startSelected > this.model.time.start) {
      _this.updateSelectedStartLimiter();
    }
   
    if(this.model.time.endSelected < this.model.time.end) {
      _this.updateSelectedEndLimiter();
    }
        
    this.parent.on('myEvent', function (evt, arg) {
      var layoutProfile = _this.getLayoutProfile();

      if (arg.profile && arg.profile.margin) {
        profiles[layoutProfile].margin = arg.profile.margin;
      }

      // set the right margin that depends on longest label width
      _this.element.select(".vzb-ts-slider-wrapper")
        .style("right", (arg.mRight - profiles[layoutProfile].margin.right) + "px");

      _this.xScale.range([0, arg.rangeMax]);      
      _this.resize();
    });
  },

  //template and model are ready
  ready: function () {
    if(this._splash) return;

    var play = this.element.select(".vzb-ts-btn-play");
    var pause = this.element.select(".vzb-ts-btn-pause");
    var _this = this;
    var time = this.model.time;

    play.on('click', function () {

      _this.model.time.play();
    });

    pause.on('click', function () {
      _this.model.time.pause("soft");
    });

    this.changeLimits();
    this.changeTime();
    this.resize();

  },

  changeLimits: function() {
    var minValue = this.model.time.start;
    var maxValue = this.model.time.end;
    //scale
    this.xScale.domain([minValue, maxValue]);
    //axis
    this.xAxis.tickValues([minValue, maxValue])
      .tickFormat(this.model.time.timeFormat);
  },

  changeTime: function() {
    this.ui.format = this.model.time.unit;
    //time slider should always receive a time model
    var time = this.model.time.value;
    //special classes
    this._optionClasses();
  },

  /**
   * Executes everytime the container or vizabi is resized
   * Ideally,it contains only operations related to size
   */
  resize: function () {

    this.model.time.pause();

    this.profile = this.getActiveProfile(profiles, presentationProfileChanges);

    var slider_w = parseInt(this.slider_outer.style("width"), 10) || 0;
    var slider_h = parseInt(this.slider_outer.style("height"), 10) || 0;
    this.width = slider_w - this.profile.margin.left - this.profile.margin.right;
    this.height = slider_h - this.profile.margin.bottom - this.profile.margin.top;
    var _this = this;

    //translate according to margins
    this.slider.attr("transform", "translate(" + this.profile.margin.left + "," + this.profile.margin.top + ")");

    //adjust scale width if it was not set manually before
    if (this.xScale.range()[1] = 1) this.xScale.range([0, this.width]);

    //adjust axis with scale
    this.xAxis = this.xAxis.scale(this.xScale)
      .tickPadding(this.profile.label_spacing);

    this.axis.attr("transform", "translate(0," + this.height / 2 + ")")
      .call(this.xAxis);

    this.select.attr("transform", "translate(0," + this.height / 2 + ")");

    this.slide.select(".background")
      .attr("height", this.height);

    //size of handle
    this.handle.attr("transform", "translate(0," + this.height / 2 + ")")
      .attr("r", this.profile.radius);

    this.sliderWidth = _this.slider.node().getBoundingClientRect().width;

    this.resizeSelectedLimiters();
    
    this._setHandle();

  },
  
  setSelectedLimits: function(force) {
    var _this = this;
    this._setSelectedLimitsId++;
    var _setSelectedLimitsId = this._setSelectedLimitsId;

    var select = _this.model.entities.select;
    if(select.length == 0) 
    {
      _this.model.time.startSelected = new Date(_this.model.time.start);
      _this.model.time.endSelected = new Date(_this.model.time.end);
      return;
    }

    var KEY = _this.model.entities.getDimension();
    var timePoints = _this.model.time.getAllSteps();
    var selectedEdgeTimes = [];
    var hooks = [];
    utils.forEach(_this.model.marker.getSubhooks(), function(hook) {
      if(hook.use == "constant") return;
      if(hook._important) hooks.push(hook._name);
    });
    
    var findEntityWithCompleteHooks = function(values) {
      for(var k = 0, l = select.length; k < l; k++) {
        var complete = 0;
        for(var i = 0, j = hooks.length; i < j; i++) {
          if(values[hooks[i]][select[k][KEY]] || values[hooks[i]][select[k][KEY]]===0) complete++;        
        }
        if(complete == hooks.length) return true;
      }
      return false;
    }
    
    var findSelectedTime = function(iterator, findCB) {
      var point = iterator();
      if(point == null) return;
      _this.model.marker.getFrame(timePoints[point], function(values) {
        if(findEntityWithCompleteHooks(values)) {
          findCB(point);
        } else {
          findSelectedTime(iterator, findCB);
        }
      });
    }
    
    var promises = [];
    
    promises.push(new Promise());

    //find startSelected time 
    findSelectedTime(function(){
      var max = timePoints.length;
      var i = 0;
      return function() {
        return i < max ? i++ : null;
      };
    }(), function(point){
      selectedEdgeTimes[0] = timePoints[point];
      promises[0].resolve();
    });
    
    promises.push(new Promise());
    
    //find endSelected time
    findSelectedTime(function(){
      var min = 0;
      var i = timePoints.length - 1;
      return function() {
        return i >= 0 ? i-- : null;
      };
    }(), function(point){
      selectedEdgeTimes[1] = timePoints[point];
      promises[1].resolve();
    });
    
    Promise.all(promises).then(function() {
      //if another setSelectedLimits was started after this 
      //then return without setup values
      if(_setSelectedLimitsId != _this._setSelectedLimitsId) return;
      _this.model.time.set(
        {"startSelected": selectedEdgeTimes[0],"endSelected": selectedEdgeTimes[1]}, force);
    });

  },

  updateSelectedStartLimiter: function() {
    this.select.select('#clip-start').remove();
    this.select.select(".selected-start").remove();
    if(this.model.time.startSelected > this.model.time.start) {
      this.select.append("clipPath")
        .attr("id", "clip-start")
        .append('rect')
      this.select.append('path')
        .attr("clip-path", "url(" + location.pathname + "#clip-start)")
        .classed('selected-start', true);
      this.resizeSelectedLimiters();
    }    
  },

  updateSelectedEndLimiter: function() {
    this.select.select('#clip-end').remove();
    this.select.select(".selected-end").remove();
    if(this.model.time.endSelected < this.model.time.end) {
      this.select.append("clipPath")
        .attr("id", "clip-end")
        .append('rect')
      this.select.append('path')
        .attr("clip-path", "url(" + location.pathname + "#clip-end)")
        .classed('selected-end', true);
      this.resizeSelectedLimiters();
    }              
  },

  resizeSelectedLimiters: function() {
    this.select.select('.selected-start')              
      .attr('d', "M0,0H" + this.xScale(this.model.time.startSelected));
    this.select.select("#clip-start").select('rect')
      .attr("x", -this.height / 2)
      .attr("y", -this.height / 2)
      .attr("height", this.height)
      .attr("width", this.xScale(this.model.time.startSelected) + this.height / 2);
    this.select.select('.selected-end')              
      .attr('d', "M" + this.xScale(this.model.time.endSelected) + ",0H" + this.xScale(this.model.time.end));
    this.select.select("#clip-end").select('rect')
      .attr("x", this.xScale(this.model.time.endSelected))
      .attr("y", -this.height / 2)
      .attr("height", this.height)
      .attr("width", this.xScale(this.model.time.end) - this.xScale(this.model.time.endSelected) + this.height / 2);
  },
  

  /**
   * Returns width of slider text value.
   * Parameters in this function needed for memoize function, so they are not redundant.
   */
  getValueWidth: function(layout, value) {
    return this.valueText.node().getBoundingClientRect().width;
  },

  /**
   * Gets brushed function to be executed when dragging
   * @returns {Function} brushed function
   */
  _getBrushed: function() {
    var _this = this;
    return function() {

      if (_this.model.time.playing)
        _this.model.time.pause();

      _this._optionClasses();
      _this.element.classed(class_dragging, true);

      var value = _this.brush.extent()[0];

      //set brushed properties

      if(d3.event.sourceEvent) {
        // Prevent window scrolling on cursor drag in Chrome/Chromium.
        d3.event.sourceEvent.preventDefault();

        _this.model.time.dragStart();
        var posX = utils.roundStep(Math.round(d3.mouse(this)[0]), precision);
        value = _this.xScale.invert(posX);
        var maxPosX = _this.width;

        if(posX > maxPosX) {
          posX = maxPosX;
        } else if(posX < 0) {
          posX = 0;
        }

        //set handle position
        _this.handle.attr("cx", posX);
        _this.valueText.attr("transform", "translate(" + posX + "," + (_this.height / 2) + ")");
        _this.valueText.text(_this.model.time.timeFormat(value));
      }

      //set time according to dragged position
      if(value - _this.model.time.value !== 0) {
        _this._setTime(value);
      }
    };
  },

  /**
   * Gets brushedEnd function to be executed when dragging ends
   * @returns {Function} brushedEnd function
   */
  _getBrushedEnd: function() {
    var _this = this;
    return function() {
      _this._setTime.recallLast();
      _this.element.classed(class_dragging, false);
      _this.model.time.dragStop();
      _this.model.time.snap();
    };
  },

  /**
   * Sets the handle to the correct position
   * @param {Boolean} transition whether to use transition or not
   */
  _setHandle: function(transition) {
    var _this = this;
    var value = this.model.time.value;
    this.slide.call(this.brush.extent([value, value]));
      
    this.element.classed("vzb-ts-disabled", this.model.time.end <= this.model.time.start);
//    this.valueText.text(this.model.time.timeFormat(value));

//    var old_pos = this.handle.attr("cx");
    var new_pos = this.xScale(value);
    if(_this.prevPosition == null) _this.prevPosition = new_pos;
    var delayAnimations = new_pos > _this.prevPosition ? this.model.time.delayAnimations : 0;
    if(transition) {
      this.handle.attr("cx", _this.prevPosition)
        .transition()
        .duration(delayAnimations)
        .ease("linear")
        .attr("cx", new_pos);

      this.valueText.attr("transform", "translate(" + _this.prevPosition + "," + (this.height / 2) + ")")
        .transition('text')
        .delay(delayAnimations)
        .text(this.model.time.timeFormat(value));
      this.valueText
        .transition()
        .duration(delayAnimations)
        .ease("linear")
        .attr("transform", "translate(" + new_pos + "," + (this.height / 2) + ")");
    } else {
      this.handle
        //cancel active transition
        .interrupt()
        .attr("cx", new_pos);

      this.valueText
        //cancel active transition
        .interrupt()
        .interrupt('text')
        .transition('text');
      this.valueText
        .attr("transform", "translate(" + new_pos + "," + (this.height / 2) + ")")
        .text(this.model.time.timeFormat(value));
    }
    _this.prevPosition = new_pos;

  },

  /**
   * Sets the current time model to time
   * @param {number} time The time
   */
  _setTime: function(time) {
    //update state
    var _this = this;
    //  frameRate = 50;

    //avoid updating more than once in "frameRate"
    //var now = new Date();
    //if (this._updTime != null && now - this._updTime < frameRate) return;
    //this._updTime = now;
    var persistent = !this.model.time.dragging && !this.model.time.playing;
    _this.model.time.getModelObject('value').set(time, false, persistent); // non persistent
  },


  /**
   * Applies some classes to the element according to options
   */
  _optionClasses: function() {
    //show/hide classes

    var show_limits = this.ui.show_limits;
    var show_value = this.ui.show_value;
    var show_value_when_drag_play = this.ui.show_value_when_drag_play;
    var axis_aligned = this.ui.axis_aligned;
    var show_play = (this.ui.show_button) && (this.model.time.playable);

    if(!show_limits) {
      this.xAxis.tickValues([]).ticks(0);
    }

    this.element.classed(class_hide_play, !show_play);
    this.element.classed(class_playing, this.model.time.playing);
    this.element.classed(class_show_value, show_value);
    this.element.classed(class_show_value_when_drag_play, show_value_when_drag_play);
    this.element.classed(class_axis_aligned, axis_aligned);
  }
});

export default TimeSlider;
