// Bootstrap Audio Player
// -----
// v1.0.0
// Long Ho
// 
// Requires Twitter Bootstrap v2.0.3+

(function () {
  'use strict';

  $.fn.audioplayer = function (option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('audioplayer')
        , options = typeof option === 'object' && option;
      if (!data) $this.data('audioplayer', (data = new AudioPlayer(this, options)));
      if (typeof option === 'string') data[option]();
    });
  }

  $.fn.audioplayer.defaults = {

  };

  $.fn.auidoplayer.constructor = AudioPlayer;
})(window.jQuery);
