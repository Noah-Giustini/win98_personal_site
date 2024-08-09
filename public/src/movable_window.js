//window divs
var about_me_window = '\
  <div class="windows-container js-windows-container" id="draggable_window" style="position:relative; margin: 0px auto;">\
    <div class="form windows js-windows windows-form" id="form">\
      <header class="js-winheader windows-header" id="draggable_window_header" style="padding-right:3px;">\
        <span>About Me</span>\
        <button class="windows-button" style="padding:0; height:16px;width:16px;position:relative;"><img src="../images/close-icon.png" style="position:absolute;left:1px;top:0px;" onclick="close_window_about();"></button>\
        <button class="windows-button" style="padding:0; height:16px;width:16px;position:relative;margin-right:3px;"><img src="../images/minimize-icon.png" style="position:absolute;left:1px;top:0px;"></button>\
      </header>\
      <div class="form-content" style="height:100%;">\
        <div class="icon-wrap">\
          <div class="icon-outer-container">\
            <div class="icon-inner-container" style="padding:20px; text-align:center;">\
              <!-- icons here -->\
              <ul></ul>\
            </div>\
          </div>\
        </div>\
      </div>\
    </div>\
  </div>';


//already opened flags
var about_me_opened = false;


//icon handlers
document.getElementById("about-me-icon-div").onclick = function() {
  if (about_me_opened === true){
    //bring to top
    var container = document.getElementById("about-me-window-div");
  } else {
    about_me_opened = true;
    var container = document.getElementById("desktop-base");
    var window = document.createElement('div'); // is a node
    window.id = "about-me-window-div";
    window.innerHTML = about_me_window;
    container.appendChild(window);
    dragElement(document.getElementById("draggable_window"));
  }
  
}

function close_window_about(){
  console.log("here");
	const element = document.getElementById("about-me-window-div");
	element.remove();
  about_me_opened = false;
}

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "draggable_window_header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "draggable_window_header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    elmnt.style.margin = 0 + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}
