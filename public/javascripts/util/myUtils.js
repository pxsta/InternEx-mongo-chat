String.prototype.Format = function(format /*,obj1,obj2...*/)
{
    var args = arguments;
    return format.replace(/\{(\d)\}/g, function(m, c) { return args[parseInt(c) + 1]; });
};
String.prototype.escapeHtml = function() {
        return this
          .replace(/&/g, '&amp;')
            .replace(/"/g,  '&quot;')
              .replace(/'/g,  '&#039;')
                .replace(/</g,  '&lt;')
                  .replace(/>/g,  '&gt;');
};