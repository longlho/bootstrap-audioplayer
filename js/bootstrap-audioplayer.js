/*jshint laxcomma:true expr:true */
/*global webkitAudioContext:true AudioContext:true console:true */
// Bootstrap Audio Player
// -----
// v1.0.0
// Long Ho
// Requires Twitter Bootstrap v2.0.3+

(function ($) {
  'use strict';

  //Audio context
  var context;

  if ('AudioContext' in window) {
    context = new AudioContext();
  } else if ('webkitAudioContext' in window) {
    context = new webkitAudioContext();
  }

  // `AudioModel` is a rudimentary wrapper that acts like a model,
  // but I don't wanna bring Backbone in since this POC is simple.
  // $audio is the `jQuery` wrapper for the `<audio>` element
  var AudioModel = function (index, song) {
    var self = this
      , drawing
      , source
      , analyzer
      , audio
      , $audio
      , buffer;

    var init = function () {
      if (!song) { return; }
      audio = new Audio();
      $audio = $(audio);
      
      $audio.data('current', parseInt(index, 10));
      $audio.data('title', song.title);
      $audio.attr('src', song.url);
      $audio.trigger('change:song', [index, song]);
      self.setState($audio.data('state') || 'play');

      $audio
        .on('loadedmetadata', function () {
          if (source) { return; }
          analyzer = context.createAnalyser();
          analyzer.smoothingTimeConstant = 0.85;

          source = context.createMediaElementSource(self.getDOMAudio());
          source.connect(analyzer);
          analyzer.connect(context.destination);
        })
        .on('ended', function () {
          self.fetch(self.getCurrent() + 1);
        })
        .data('state', 'pause');
    };

    function drawSpectrum() {
      if (!analyzer) { return; }
      var canvas = $('#visualizer')[0];
      var ctx = canvas.getContext('2d');
      var width = canvas.width;
      var height = canvas.height;
      var bar_width = 10;

      ctx.clearRect(0, 0, width, height);

      var freqByteData = new Uint8Array(analyzer.frequencyBinCount);
      analyzer.getByteFrequencyData(freqByteData);

      var barCount = Math.round(width / bar_width);
      for (var i = 0; i < barCount; i++) {
          var magnitude = freqByteData[i];
          // some values need adjusting to fit on the canvas
          ctx.fillRect(bar_width * i, height, bar_width - 2, -magnitude + 60);
      }
    }

    this.setState = function (state) {
      if (state === 'pause') {
        this.pause();
      } else {
        this.play();
      }
      
      $audio.data('state', state);
      $audio.trigger('change:state', state);
    };
    this.getState = function () {
      return $audio.data('state');
    };
    this.getCurrent = function () {
      return $audio.data('current');
    };
    
    this.getDOMAudio = function () {
      return $audio.get(0);
    };
    this.getSource = function () {
      return source;
    };

    this.play = function () {
      clearInterval(drawing);
      drawing = setInterval(drawSpectrum, 50);
      return this.getDOMAudio().play();
    };
    this.pause = function () {
      clearInterval(drawing);
      return this.getDOMAudio().pause();
    };
    this.getAudio = function () {
      return $audio;
    };
    this.remove = function () {
      this.pause();
      $audio.unbind();
      return $audio.remove();
    };

    init();
  };

  var AudioPlayer = function (el, opts) {
    opts = opts || {};
    var self = this;
    this.options = opts;
    this.$el = $(el);
    
    this.dom = {
      $next: this.$el.find('.playback .next'),
      $prev: this.$el.find('.playback .prev'),
      $play: this.$el.find('.playback .play'),
      $info: this.$el.find('.track-info'),
      $progress: this.$el.find('.track-progress'),
      $loader: this.$el.find('.loader'),
      $timer: this.$el.find('.timer'),
      $slider: this.$el.find('.slider'),
      $handle: this.$el.find('.handle'),
      $title: this.$el.find('.title')
    };

    this.current = 0;
    this.model = new AudioModel(this.current, this.options.songs[this.current]);
    this.dom.$next.click($.proxy(this.next, this));
    this.dom.$prev.click($.proxy(this.prev, this));
    this.dom.$play.click($.proxy(this.playToggle, this));
    this.configure();

    opts.autoplay && this.play();

  };

  AudioPlayer.prototype = {
    constructor: AudioPlayer,
    next: function (e) {
      e && e.preventDefault();
      e = $.Event('next');
      this.$el.trigger(e);
      if (e.isDefaultPrevented()) return;
      if (this.current === this.options.songs.length - 1) {
        return;
      } else {
        this.current++;
      }
      this.model.remove();
      this.model = new AudioModel(this.current, this.options.songs[this.current]);
      this.configure();
    },
    prev: function (e) {
      e && e.preventDefault();
      e = $.Event('prev');
      this.$el.trigger(e);
      if (e.isDefaultPrevented()) return;
      if (!this.current) {
        return;
      } else {
        this.current--;
      }
      this.model.remove();
      this.model = new AudioModel(this.current, this.options.songs[this.current]);
      this.configure();
    },
    playToggle: function (e) {
      e && e.preventDefault();
      switch (this.model.getState()) {
        case 'play':
          this.model.setState('pause');
          e = $.Event('play');
          break;
        case 'pause':
          this.model.setState('play');
          e = $.Event('pause');
          break;
      }
      this.$el.trigger(e);
    },
    play: function (e) {
      this.model.getState() === 'pause' && this.playToggle();
    },
    pause: function (e) {
      this.model.getState() === 'play' && this.playToggle();
    },
    configure: function () {
      var self = this;
      this.model.getAudio()
        .on('change:song', function (ev, index, song) {
          self.dom.$title.text(song.title);
        })
        .on('change:state', function (ev, state) {
          return self.dom.$play.html('<i class="icon-' + (state === 'play' ? 'pause' : 'play') + '"></i>');
        })
        .on('progress', function () {
          var buffered = this.buffered.end(0);
          if (!buffered) return;
          var loaded = parseInt(((buffered / this.duration) * 100) + 3, 10);
          self.dom.$loader.css('width', loaded + '%');
        })
        .on('timeupdate', function () {
          var rem = parseInt(this.duration - this.currentTime, 10),
          pos = Math.floor((this.currentTime / this.duration) * 100),
          mins = Math.floor(rem/60, 10),
          secs = rem - mins * 60;

          self.dom.$timer.text('-' + mins + ':' + (secs > 9 ? secs : '0' + secs));
          // if (!manualSeek) { options.handle.css({left: pos + '%'}); }
          // if (!loaded) {
          //   loaded = true;
          // }
        });
    }
  };

 /* MODAL PLUGIN DEFINITION
  * ======================= */

  $.fn.audioplayer = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('audioplayer')
        , options = $.extend({}, $.fn.audioplayer.defaults, $this.data(), typeof option === 'object' && option);
      if (!data) {
        $this.data('audioplayer', (data = new AudioPlayer(this, options)));
      }
      if (typeof option === 'string') {
        data[option]();
      }
    });
  };

  $.fn.audioplayer.defaults = {
    autoplay: true,
    songs: []
  };

  $.fn.audioplayer.Constructor = AudioPlayer;
})(window.jQuery);
