/*jshint laxcomma:true expr:true*/
// Bootstrap Audio Player
// -----
// v1.0.0
// Long Ho
// Requires Twitter Bootstrap v2.0.3+

(function ($) {
  'use strict';

  // `AudioModel` is a rudimentary wrapper that acts like a model,
  // but I don't wanna bring Backbone in since this POC is simple.
  // $audio is the `jQuery` wrapper for the `<audio>` element
  var AudioModel = function ($audio) {
    var self = this;
    this.$audio = $audio;

    var _reset = function (index, filename) {
      if (!filename) { return; }
      this.$audio.data('current', parseInt(index, 10));
      this.$audio.trigger('change:index', $audio.data('current'));
      this.$audio.attr('src', filename);
      this.$audio.trigger('change:src', filename);
      this.setState($audio.data('state') || 'play');
    };

    this.$audio.on('ended', function () {
      self.fetch(self.getCurrent() + 1);
    });

    this.setState = function (state) {
      switch (state) {
        case 'play':
          this.getDOMAudio().play();
          break;
        case 'pause':
          this.getDOMAudio().pause();
          break;
      }
      this.$audio.data('state', state);
      this.$audio.trigger('change:state', state);
    };
    this.getState = function () {
      return this.$audio.data('state');
    };
    this.getCurrent = function () {
      return this.$audio.data('current');
    };
    this.fetch = function (index, song) {
      _reset.call(self, index, song.url);
      //Do a AJAX to get arraybuffer here.
    };
    this.getDOMAudio = function () {
      return $audio.get(0);
    };
  };

  var AudioPlayer = function (el, opts) {
    opts = opts || {};
    var self = this;
    this.options = opts;
    this.$el = $(el);
    this.dom = {
      $next: this.$el.find('.playback-next'),
      $prev: this.$el.find('.playback-prev'),
      $play: this.$el.find('.playback-play'),
      $info: this.$el.find('.track-info'),
      $progress: this.$el.find('.track-progress'),
      $loader: this.$el.find('.loader'),
      $timer: this.$el.find('.timer'),
      $slider: this.$el.find('.slider'),
      $handle: this.$el.find('.handle'),
      $title: this.$el.find('.title'),
      $audio: this.$el.find('audio')
    };
    this.model = new AudioModel(this.dom.$audio);
    this.dom.$audio
      .on('change:src', function (ev, filename) {
        var filenameArr = filename.split('/')
          , songName = filenameArr[filenameArr.length - 1];
        self.dom.$title.text(songName);
      })
      .on('change:state', function (ev, state) {
        return self.dom.$play.text(state === 'play' ? "||" : 'Play');
      });

    this.current = 0;
    this.dom.$next.click($.proxy(this.next, this));
    this.dom.$prev.click($.proxy(this.prev, this));
    this.dom.$play.click($.proxy(this.playToggle, this));
  };

  AudioPlayer.prototype = {
    constructor: AudioPlayer,
    next: function (e) {
      e && e.preventDefault();
      e = $.Event('next');
      this.$el.trigger(e);
      if (e.isDefaultPrevented()) return;
      if (this.current === this.options.songs.length - 1) {
        this.current = 0;
      } else {
        this.current++;
      }
      this.model.fetch(this.current, this.options.songs[this.current]);
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
      this.model.fetch(this.current, this.options.songs[this.current]);
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
      this.model.getState() === 'play' && this.playToggle();
    },
    pause: function (e) {
      this.model.getState() === 'pause' && this.playToggle();
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
    autoplay: true
  };

  $.fn.audioplayer.Constructor = AudioPlayer;
})(window.jQuery);
