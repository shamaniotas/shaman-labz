
 //completely reworked by Shaman Iotas Took Mar 2, 2013
 //satoshi was a prophet and iotas is his shaman


/*
spriteSets = [
	{
		common_properties:{
			framerate:obj.framerate, framestep:framestep.value, 
			bgColor=obj.bgColor, spriteWidth=obj.spriteWidth, 
			spriteHeight:obj.spriteHeight, frameCount:obj.frameCount,
  			rows:obj.rows, columns:obj.columns, imageX:obj.imageX,imageY:obj.imageY, offset:offset
  		},
		spritesheets:[
	  		{id:0,url:'testing.png',default:true},
	  		{id:1,url:'testing2.png',default:false}
		]
	} //,
	//{common_properties:{a:b,x:y},spritesheets[{id:id,ur:url},{id:id,url:url}]},
	//{etc}
]
*/



function ancientBeastViewer(sSets){
	var me=this;
	me.playing=0;
	me.ssArray = [];
	me.defaultSpriteSheet = false;
	if(typeof(sSets)!=='undefined'){
		for(var i=0; i<sSets.length; i++){
			var spriteSet = sSets[i];
			var cpropsobj = spriteSet.common_properties;
			for(var j=0; j<spriteSet.spritesheets.length; j++){
				var imgObj = spriteSet.spritesheets[j];
				var ss = new spriteSheet(cpropsobj,imgObj);
				me.ssArray.push(ss);
				if(ss.default){
					me.defaultSpriteSheet=me.ssArray.length-1;
				}
			}
		}
	}
	me.getDefaultAnimatedCanvas=function(){
		var ss = me.ssArray[me.defaultSpriteSheet];
		ss.play();
		return ss.canvas; //this is a canvas object, rendering/animated just drop in div :)
	};
	
	//returns a canvas object playing, stops all others
	//only use this to 'toggle' images and drop into a prepped div
	//makes it real easy to tie to select or table-row-click or something
	me.switchss = function(id){ 
		me.stopAll();
		var animatedCanvas = getAnimatedCanvasById(id);
		return animantedCanvas;
	}
	//only difference from above is that this one
	//does NOT stop all others, but returns a playing canvas
	me.getAnimatedCanvasById = function(id){
		var retss=false;
		for(var i=0; i< me.ssArray.length; i++){
			var ss = me.ssArray[i];
			if(ss.id==id){
				retss = ss;
			}
		}
		retss.play();
		return retss.canvas; //returns a canvas object
		me.playing++;
	};
	
	//does not disable any others
	me.getAnimatedSpriteSheetByIndex = function(idx){
		me.ssArray[idx].play();
		return me.ssArray[idx].canvas; //returns a canvas object
		me.playing++;
	};
	
	me.stopAll = function(){
		for(var i=0; i<me.ssArray.length; i++){
			me.ssArray[i].stop();
		}
		me.playing=0;
	};
	
	me.stopAnimatedSpriteSheetById = function(id){
	};
	
	me.removeAnimatedSpriteSheetById = function(id){
	};
	
	me.addNewSpriteSheet = function(cpobj,imgobj){
	};
}

function spriteSheet(cpobj,imgobj){
	var me = this;
	///*function updateFields() {	//duh, updates the values defined in index.html
	//	framerate = parseInt(document.getElementById("textField0").value);
	//	bgColor = document.getElementById("textField1").value;
	//	spriteWidth = parseInt(document.getElementById("textField2").value);
	//	spriteHeight = parseInt(document.getElementById("textField3").value);
	//***replaced with frameCount (makes more sense)	imageCount = parseInt(document.getElementById("textField4").value);
	//	framestep = parseInt(document.getElementById("textField5").value);
	//	rows = parseInt(document.getElementById("textField6").value);
	//	columns = parseInt(document.getElementById("textField7").value);
	//	imageX = parseInt(document.getElementById("textField8").value);
	//	imageY = parseInt(document.getElementById("textField9").value);
	//	offset = parseInt(document.getElementById("textField10").value);
	//	changeCanvasSize();
	//}*//*not needed as all this is replaced in constructor*/
	me.id=imgobj.id;
	me.url = imgobj.url;
	me.default = imgobj.default;
	
	me.framerate = cpobj.framerate;
	me.bgColor = cpobj.bgColor;
	me.spriteWidth = cpobj.spriteWidth;
	me.spriteHeight = cpobj.spriteHeight;
	me.frameCount = cpobj.frameCount;
	me.framestep = cpobj.framestep;
	me.rows = cpobj.rows;
	me.columns = cpobj.columns;
	me.imageX = cpobj.imageX;
	me.imageY = cpobj.imageY;
	me.offset = cpobj.offset;
	me.canvas = document.createElement('canvas');
	me.canvas.ssid = me.id;
	
	me.canvas.height = me.spriteHeight;
	me.canvas.width = me.spriteWidth;
	me.playing=false;
	me.loaded=false;

	me.currentFrame=0;
	me.column=0;
	me.row=0;
	me.intervalId = 0; //an integer replaces intervalThingy ;)

	me.img = new Image();
	me.img.src = me.url;
	me.img.onload = function(){
		me.loaded=true;
	};	

	me.loadImage=function(){
		me.img = new Image();
		me.img.src = me.url;
		me.img.onload = function(){
			me.loaded=true;
		};
	};
	me.play=function(){ //starts the animation
		me.stop();	//stop needed, otherwise would pile the ticking processes
		me.intervalId = setInterval	(	
			function(){
				me.currentFrame += me.framestep;
				if(me.currentFrame >= me.frameCount) {
					me.currentFrame = 0;
				}
				me.draw();
			},
			parseInt(1e3/me.framerate)
		)
		me.playing=true;
		//me.tick();
	};
	me.stop=function(){	//stops the animation
		if(me.intervalId!==0){
			clearInterval(me.intervalId);
			me.intervalId=0;
			me.playing=false;
		}
	};
	me.draw=function() {
		//clear first
		var c = me.canvas;
		var ctx = c.getContext('2d');
		ctx.fillStyle = me.bgColor;
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, c.width, c. height);
		ctx.restore();
		//fill the canvas	
		ctx.fillStyle = me.bgColor;
		ctx.fillRect(0,0, me.canvas.width, me.canvas.height)
		{
			//calculates the column and row for this frame
			me.row = Math.floor(me.currentFrame / me.columns);
			me.column = me.currentFrame - me.columns * me.row;
			//takes right part of image and puts on canvas
			ctx.drawImage(me.img, me.column * me.spriteWidth + (me.column*2 + 1) * me.offset,
				 me.row * me.spriteHeight + (me.row*2 + 1) * me.offset,
				 me.spriteWidth, me.spriteHeight, me.imageX, me.imageY, me.spriteWidth, me.spriteHeight);
		}
	}
	/*
	// function getImages() { //this function reads the image into a array of imageData objects
							  // it should not be needed, unless pixel-wise operations have to be done
	// 
			// var tempCanv = document.createElement("canvas");
			// tempCanv.width = tempImg.width;
			// tempCanv.height = tempImg.height;
	// 
			// tempCanv.getContext("2d").fillStyle = bgColor;
			// tempCanv.getContext("2d").fillRect(0, 0, tempCanv.width, tempCanv.height)
			// tempCanv.getContext("2d").drawImage(tempImg, 0, 0);
	// 
			// //alert("have canvas: "+tempCanv+", "+tempCanv.getContext("2d"))
	// 
			// //alert("rows: "+rows);
			// for( i = 0; i < frameCount; i++) {
				// row = Math.floor(i / columns);
				// column = i - i * row;
				// //alert("row: "+row+" column:"+column)
				// //alert(column*spriteWidth+", "+row*spriteHeight)
				// images[i] = tempCanv.getContext("2d").getImageData(column * spriteWidth, row * spriteHeight, spriteWidth, spriteHeight);
			// }
	// 	
	// }
	*/
}

