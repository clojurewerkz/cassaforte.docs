// jQuery.fn.toc = function () {
//   if(this.length === 0)
//     return;

//   var listStack = [$("<ul class='nav nav-list bs-docs-sidenav'/>")];
//   listStack[0].appendTo(this);

//   Array.prototype.last = function() { return this[this.length - 1]};

//   var level = 2;
//   $(document).ready(function() {
//     $(":header").each(function(index, el) {
//       var currentLevel = 2;

//       var text = $(el).text();
//       var anchor = text.replace(/[^a-zA-Z 0-9]+/g,'').replace(/\s/g, "_").toLowerCase();

//       $(el).attr('id', anchor);

//       if(currentLevel > level) {
//         var nextLevelList = $("<ul class='nav nav-list'/>");
//         nextLevelList.appendTo(listStack.last().children("li").last());
//         listStack.push(nextLevelList);
//       } else if(currentLevel < level) {
// 	      var delta = level - currentLevel;
//         for(var i = 0; i < delta; i ++) {
// 	        listStack.pop();
// 	      }
//       }

//       level = currentLevel;
//       var li = $("<li />");

//       $("<a />").text(text).attr('href', "#" + anchor).appendTo(li);
//       li.appendTo(listStack.last());
//     });
//   });
// };

// $(document).ready(function() {
//   $("#side-navigation").toc();

//   $("#side-navigation .nav-list").affix({
//     offset: {
//       top: 0,
//       bottom: 0
//     }
//   });

//     $('#side-navigation .nav-list').on('affixed', function () {
//       console.log(123123)
//         $('#side-navigation .nav-list').addClass('navbar-fixed-top')
//     });

//     $('#side-navigation .nav-list').on('unaffixed', function () {
//         $('#side-navigation .nav-list').removeClass('navbar-fixed-top')
//     });
// });

$(document).ready(function() {
  var $toc = $('#toc');

  function format (title) {
    var $title = $(title),
        txt = $title.text(),
        id = $title.attr('id');
    return "<li> <a href=#" + id + ">" + txt + "</a></li>";
  }
  // return;

  if($toc.length) {
    var $h3s = $('.span9 :header');
    var titles = $h3s.map(function () {
      return format(this);
    }).get().join('');
    $toc.html(titles);
  }

  $("#toc").affix();
  // $('[data-spy="scroll"]').each(function () {
    // var $spy = $(this).scrollspy('refresh');
  // });

});
