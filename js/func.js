$(function() {

//deflate
function encode(str) {return $.base64.encode(RawDeflate.deflate(unescape(encodeURIComponent(str))));}

//inflate
function decode(str) {return decodeURIComponent(escape(RawDeflate.inflate($.base64.decode(str))));}

//controls eye-dropper and filler modes
window.dropper = false;
window.filler = false;

//image table initialization
window.rows = 24;
window.cols = 24;
window.table_array = new Array(rows*cols);
window.table_colors_array = new Array();

var table_out = "";

for(var r=0; r < rows;r++){
	table_out += "<tr>";
	for(var c=0; c < cols;c++){
		table_out += "<td></td>";
	}
	table_out += "</tr>\n";
}
$("#image").html(table_out);
$("#underlay").html(table_out);

//initialize mini preview
window.p = new PNGlib(cols, rows, 256);
var background = p.color(255, 255, 255, 255);
$('#preview').attr("src",'data:image/png;base64,'+p.getBase64());

$('table td').mousedown(function() {

	if(filler){
		
		fill_image($(this),$(this).css("background-color"));
	}else if(dropper){
		change_selected_color($(this).css("background-color"));
		$("#eyedropper").css("background","#eee");
		dropper = false;
	}else{
		$(this).css("background",$.minicolors.rgbString($("#minicolors")));	
   		$('td').bind('mouseover', function(){
    		document.onselectstart = function(){ return false; }
    		$(this).css("background",$.minicolors.rgbString($("#minicolors")));
    	});
	}
	
}).mouseup(function(){
	document.onselectstart = function(){ return true; }
    $('table td').unbind('mouseover');
    update_preview();
});

//toggles the dev console display for more detailed info
$("#console").click(function(){
	$("#dev").toggle();
	$("#preview").toggle();
});

//clears drawing area
$("#clear").click(function(){
	$("td").each(function() {
		$(this).css("background-color","#fff");
	});
	parent.location.hash = "#something";
	removeHash();
	update_preview();
});

//handles enabling eyedropper state
$("#eyedropper").click(function(){
	$(this).css("background-color","#fc3");
	dropper = true;
});

//handles enabling filler state
$("#fill").click(function(){
	if(filler){
		$(this).css("background-color","#eee");
		filler = false;
	}else{
		$(this).css("background-color","#fc3");
		filler = true;
	}
	
});

window.update_table_colors_array = function(){

	var current_col = 0;
	var current_row = 0;
	var current_row_colors = new Array();

	$("#image td").each(function(i){
		if(current_col<cols-1){
			current_row_colors.push($(this).css("background-color"));
			current_col+=1;
		}else{
			table_colors_array[current_row] = current_row_colors;
			current_row_colors = [];
			current_row+=1;
			current_col=0;
		}
	});
/*
//development checking of table color array
var dev_out = "";
for(var y=0;y<rows;y++){for(var x=0;x<cols;x++){dev_out += table_colors_array[y][x] + " ";}dev_out += "\n";}
console.log(dev_out);
*/
};

//recursive function to fill space based on 4-directional plane (meaning no diagonals will be filled)
window.fill_image = function(cur_td, target_color){
	var replacement_color = $.minicolors.rgbString($("#minicolors"));
	if(cur_td.css("background-color") != target_color){
		return;
	}else if(cur_td.css("background-color") == replacement_color){
		return;
	}else{
		cur_td.css("background-color", replacement_color);
	}
	if(cur_td.next("td").length){
		fill_image(cur_td.next("td"), target_color);
	}
	if(cur_td.prev("td").length){	
		fill_image(cur_td.prev("td"), target_color);
	}
	if(cur_td.parent().next().children("td:eq(" + cur_td.index() + ")").length){
		fill_image(cur_td.parent().next().children("td:eq(" + String(cur_td.index()) + ")"), target_color);
	}
	if(cur_td.parent().prev().children("td:eq(" + cur_td.index() + ")").length){
		fill_image(cur_td.parent().prev().children("td:eq(" + String(cur_td.index()) + ")"), target_color);
	}
};


//changes color selected from default palette area
$("#palette span").click(function(){
	change_selected_color($(this).css("background-color"));
});

//updates image
window.update_preview = function(){
	gather_rgb();
	var k = 0;
	for(var y = 0; y<rows; y++){
		for(var x =0; x<cols; x++){
    		p.buffer[p.index(x,y)] = p.color(table_array[k][0], table_array[k][1], table_array[k][2]);
    		k+=1;
		}
	}

	var raw = p.getBase64();
	$('#preview').attr("src",'data:image/png;base64,' + raw);

	var encoded = encode(raw);

	$("#dev").html("<strong>Original size:</strong> " + 
	String(raw.length) + 
	"<br><strong>Compressed size:</strong> " + 
	String(encoded.length) + 
	"<br><strong>Percent of original:</strong> %" + 
	String((encoded.length/raw.length)*100) + 
	"<br><br>\n<strong>Original:</strong><br> " +
	raw + 
	"<br><br>\n<strong>Compressed:</strong><br> " + 
	encoded);

	parent.location.hash = encoded;
}

//gathers rgb information from image drawing table
window.gather_rgb = function(){
	$("#image td").each(function(i) {
		var colors = new Array();
		if($(this).css('background-color') == "rgba(0, 0, 0, 0)"){
			colors = ["255","255","255"];
		}else{
			colors = $(this).css("background-color").replace(/^(rgb|rgba)\(/,'').replace(/\)$/,'').replace(/\s/g,'').split(',');
		}
		table_array[i] = colors;
	});
}

//converts lzw hash into base64 image data, then converts to canvas for image table display
if(parent.location.hash){
	var encoded = parent.location.hash.substr(1);
	var decoded = decode(encoded);
	var base64_display = 'data:image/png;base64,' + decoded;
	$('#preview').attr("src", base64_display);

	var image = new Image();
	image.onload = function() {
		var canvas = document.createElement('canvas');
		canvas.width = image.width;
		canvas.height = image.height;

		var context = canvas.getContext('2d');
		context.drawImage(image, 0, 0);

		var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
		var k = 0;
		for(var y = 0; y<canvas.height; y++){
			for(var x =0; x<canvas.width; x++){
				var index = (y*imageData.width + x) * 4;
				var red = imageData.data[index];
   				var green = imageData.data[index + 1];
    			var blue = imageData.data[index + 2];
    			table_array[k] = new Array(red,green,blue);
    			k+=1;
			}
		}

		$("#image td").each(function(i) {
			$(this).css("background-color", 
			"rgb("+String(table_array[i][0])+","+
			String(table_array[i][1])+","+
			String(table_array[i][2])+")"); 
		});
	};
image.src = base64_display;
};

//function to gracefully remove hash to begin anew
window.removeHash = function() { 
	//doesn't seem to work as expected, so just a simple redirection to clean URL for now.
	/*
    var scrollV, scrollH, loc = window.location;
    if ("pushState" in history)
        history.pushState("", document.title, loc.pathname + loc.search);
    else {
        // Prevent scrolling by storing the page's current scroll offset
        scrollV = document.body.scrollTop;
        scrollH = document.body.scrollLeft;

        loc.hash = "";

        // Restore the scroll offset, should be flicker free
        document.body.scrollTop = scrollV;
        document.body.scrollLeft = scrollH;
    }
    */
    window.location.href = window.location.href.split('#')[0];
}

//handles changing the color currently selected
window.change_selected_color = function(rgb_color){
	$("#minicolors").val(rgb2hex(rgb_color));
	$.minicolors.refresh()
};

//converts rgb values to their hex equivalent
function rgb2hex(rgb) {
	rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	function hex(x) {
    	return ("0" + parseInt(x).toString(16)).slice(-2);
	}
	return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

});
