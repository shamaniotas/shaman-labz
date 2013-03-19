/********************************************************
shaman iotas took
copyright January 2013
all rights reserved
completely revamped, february 3, 2013 ~iotas & stentor
updated again february 23, 2013 ~shaman iotas
*/
/*********************************************************************************/
/*
This is worker.js, which is launched in a webworker
the webworker is controlled by satoshi web client (satoshi.js)
it is possible to serve this up as a template and embed other stuff
such as session, etc, but that's for later.
*/
/*********************************************************************************/
importScripts('/js/SHA256.js');

var _r= 'satoshi'; //{{realm.name}}
var _dk= '^(0{x})'; //{{realm.diffKey}}
var _ik = '(0{0,3})(0{0,})([0-9a-f]*)([0-9a-f]{16})([0-9a-f]{16})([0-9a-f]{16})$'; //{{realm.itemKey}}

var _s={}; //stub object
var b=new Date().getTime(); //born
var _st=false; //started boolean flag
var _df=3; //default difficulty
var _lm = {}; //this is the global object literal for the last mani match
var _lgm = 0; //lastGemMatch
var _lt=_lc=0;  //this is 'last time' and 'last count' used globally to represent last mani

self.onmessage = function(e) {
  if(e.data.cmd == 'start'){
  	if(_st){return;} //should probably send error message object
  	_dk = e.data.diffKey || _dk;
  	_ik = e.data.itemKey || _ik;
	_s = e.data._s || {};
	_s.b = b; //born
	_s.c = 0; //count
	_s.d = _df; //
	_s.dc=0; //difference in count from last mani
	_s.dg=_lgm; //difference in count from last Gem Match
	_s.dt=0; //difference in time from last mani
	_lt = _s.b;
	if(e.data.loc){_s.loc=e.data.loc;}
	_s.m = 0; //match
	_s.r = _r; //realm
	_st = true;
	runFlag = true;
	xanidu();
  }
};

function xanidu(){
  postMessage({cmd:'status', msg:'running',stub:_s});
  while(true){ 
  	_s.b = new Date().getTime(); //milliseconds since epoch (January 1, 1970)
  	_s.dc = _s.c - _lc;
  	_s.dg = _s.m - _lgm;
  	_s.dt = _s.b - _lt;
  	_s.d = throttle(_s.dc,_s.dt); //keeping the names short
  	var __dp = _dk.replace('x',_s.d); //diffPattern
  	var __rxd = new RegExp(__dp);
  	var __ds = JSON.stringify(_s);
  	var sha = SHA256(__ds);
  	//nothing can change on the stub after this point until AFTER the post back
  		//and only then, in reset/update for next iteration...
  	//therefore, all return values are attached to the 'cmd' object to return
	if(__rxd.test(sha)){
	    var __rc = {cmd:'m'}; //match object return command
	    //__rc.rar=0;	//return command rarity
	    _lc = _s.c; //lastcount = stub.count
	    _lt = _s.b; //lasttime = stub.born
	    var __frk = __dp + _ik; //fullrealmkey = diffpattern + itemKey
	    var __p=new RegExp(__frk); //use fullrealmkey to check matches
	    var __ms = __p.exec(sha); //matches array = regex.exec
	    var __ma=__ms.slice(0,__ms.length); __ma.push('?'); //slice all we need into new array
	    var __ai = 0;
	    var __ri = 0;
	    var __ui = 0;
	    if(__ma[2].length && !__ma[3].length){ //a common with some rarity
	    	__rc.cmd = 'c'; //set this to common type
	    	__rc.rar=__ma[2].length; //rarity will be 1,2 or 3 for copper, silver and gold, respectively
	    	_lgm = _s.m;
	    	__rc.k = 0;
	    	if(__ma[5].substr(0,1) == '0'){
	    		__rc.k = 1;
	    		__ui=1;
	    	}
	    	if(__ma[6].substr(0,1) == '0'){
	    		__ai=1;
	    	}
	    	if(__ma[7].substr(0,1) == '0'){
	    		__ri=1;
	    	}
	    }
	    else if(__ma[3].length){ //a rare with some rarity
	    	__rc.cmd = 'r'; //set this to rare type
	    	__rc.rar=__ma[3].length; //rarity will be however many repititions of the realmkeys
	    	_lgm = _s.m;
	    	__rc.k = 1;
	    	__ui=1;
	    	if(__ma[6].substr(0,1) == '0'){
	    		__ai=1;
	    	}
	    	if(__ma[7].substr(0,1) == '0'){
	    		__ri=1;
	    	}
	    }
	    __rc.i=[__ui,__ai,__ri];
	    __rc.npoe=__ma;//nine-pieces-of-eight set to matches array
	    __rc.proofs = [_lm,_s]; //here are the proofs, aren't they cool!, this matched...
	    __rc.appdata = {};
		postMessage(__rc); //now worker posts back to satoshi
		_lm = JSON.parse(JSON.stringify(_s)); //clone and store this stub for next go-around
		_s.m++; //increase number of matches (making this zero-based)
	} //end-if on the regex test,
	_s.c++; //next count (making this zero-based as well)
  }
}

function throttle(c,t){
  //we will keep it really simple for now
  //allowing for some 'cheating' optimization :) for now
  var temp = 3;  
  var dc = c || 0;
  var dt = t || 1; //avoid divide by zero on first call
  var kopsec = (dc / dt) || 0; //this is using the most recent match
  if(kopsec >= 0 && kopsec <= 4){ // <3kops, your computer sucks, we'll give you easy difficulty
  	temp = 3;
  }else if(kopsec > 4 && kopsec <= 12){ // 3 < optimal range to make bank >12
  	temp = 4;
  }else if(kopsec > 12 && kopsec <= 30){ // expand this better
  	temp = 5;
  }
  else{ //this gets really tough above here...more on this later...
  	temp = Math.round(kopsec/30e3) + 5;
  }
  return temp;
}
self.postMessage({cmd:'status',msg:'worker initialized'});