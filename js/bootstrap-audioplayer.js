/*jshint laxcomma:true expr:true */
/*global webkitAudioContext:true AudioContext:true */
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
    var self = this
      , source
      , context;

    if ('AudioContext' in window) {
      context = new AudioContext();
    } else if ('webkitAudioContext' in window) {
      context = new webkitAudioContext();
    }
    
    var _reset = function (index, song) {
      if (!song) { return; }
      $audio.data('current', parseInt(index, 10));
      $audio.data('title', song.title);
      //No webkitAudioContext, no fun stuff
      if (!context) {
        $audio.attr('src', song.url);
        $audio.trigger('change:song', [index, song]);
        this.setState($audio.data('state') || 'play');
        return;
      }
      //Fun stuff is here
      // $.ajax({
      //   url: song.url,
      //   datatype: 'arraybuffer',
      //   success: function (data) {
          
      //   }
      // });
      var request = new XMLHttpRequest();
      request.open('GET', song.url, true);
      request.responseType = 'arraybuffer';

      // Decode asynchronously
      request.onload = function() {
        context.decodeAudioData(request.response, function(buffer) {
            source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(context.destination);
            source.noteOn(0);
          });
      };
      request.send();
    };

    $audio.on('ended', function () {
      self.fetch(self.getCurrent() + 1);
    }).data('state', 'pause');

    this.setState = function (state) {
      if (state === 'pause') {
        this.getDOMAudio().pause();
      } else {
        this.getDOMAudio().play();
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
    this.fetch = function (index, song) {
      _reset.call(this, index, song);
      //Do a AJAX to get arraybuffer here.
    };
    this.getDOMAudio = function () {
      return $audio.get(0);
    };
    this.getSource = function () {
      return source;
    };
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
      $title: this.$el.find('.title'),
      $audio: this.$el.find('audio')
    };
    this.model = new AudioModel(this.dom.$audio);
    this.dom.$audio
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

    this.current = 0;
    this.dom.$next.click($.proxy(this.next, this));
    this.dom.$prev.click($.proxy(this.prev, this));
    this.dom.$play.click($.proxy(this.playToggle, this));
    this.model.fetch(this.current, this.options.songs[this.current]);

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
      this.model.getState() === 'pause' && this.playToggle();
    },
    pause: function (e) {
      this.model.getState() === 'play' && this.playToggle();
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
