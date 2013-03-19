 /********************************************************
 shaman iotas took
 copyright 2013
 all rights reserved
 Totally Revamped February 3-4, 2013 ~ took
 ~illara February 5, 2013
 ~updated feb 17, 2013 tandem
 ~reworked feb 24, 2013 shaman
 ~still working, feb 28, 2013 shaman
*********************************************************/

var satoshiClient = {
	//me:{},
    workerfile:'/js/satoshi_worker.js',
    _apiversion:'0.1',
    _diffKey:'^(0{x})',
    _itemKey:'(0{0,3})(0{0,})([0-9a-f]*)([0-9a-f]{16})([0-9a-f]{16})([0-9a-f]{16})$',
    _preferences:{
    	maxSize:100000,
    	autoPackage:true,
    	autoSubmit:true,
    	autoRestart:true,
    	altProfile:0,
    	debug:true,
    	debugLevel:9,
    	maniPassThrough:true,
    	passThroughLogLevel:10,
    },
    _urls:{
    	commitPackage:'/sha/user/package/commit',
    	pendingPackages:'/sha/user/packages/pending'
    },
    /********************
    note, UI can tie into this status and query after each event raised
    from onmessage. also, with regard to common/rare, the UI can also
    update those object arrays, just check/set accordingly in code for
    _status.hold. internally, satoshi will put the status on hold when 
    updating the common or rare, but will not check for a hold. satoshi
    only updates status on each manifest that arrives, and that happens
    BEFORE this is passed to the application, so contention should be
    nearly zero (exceptions being when a new event arrives just as app
    is updating common or rare).
    ********************/
    /************************************************************************************/
    //misc
    /************************************************************************************/
    _status:{}, //end _status object (initialized at end)
    _stub:{},
    newmanifest:[],
	_manadump:[],
    worker:undefined,
    packages:[],
    submittedPackages:[],
    deletedPackages:[],
    run:0,
    
    /************************************************************************************/
    //external connectors
    /************************************************************************************/
    //status:_status,
	hookdiv:undefined,
	onmsg:undefined,
    
    init:function(prefs,mhandler){
    	this._setPreferences(prefs);
    	this.onmsg=mhandler;
		this._resetstatus();
		this.browserDetect.init();
		//need to initialize for listening/sending html5 xdomain messages
		//see this._broadcast(obj) below, already hooked into this._onmsg(obj);
	},
	//note: not internal, but needs to be implemented so leaving up top
	_broadcast:function(obj){
		//todo: setup broadcast to send to any listening domains
			//e.g. embedded iframe sending msgs back to host page
			//this needs to be loaded
	},
    start:function(){
    	this._start();
    },
    stop:function(){
    	this._stop();
    },
    package:function(){
    	this._package();
    },
    commit:function(idx){
    	this._commitpackage(idx);
    },
	get2DGem:function(mani,wdth,hght){
		var gem2Dcanvas = this._get2DGem(mani,wdth,hght);
		return gem2Dcanvas;
	},
    deleteQueuedPackage:function(idx){
    	this._deleteQueuedPackage(idx);
    },
    getStatus:function(){return this._status;},
    getPreferences:function(){return this._preferences;},
    setPreferences:function(prefs){
    	this._setPreferences(prefs);
    },
    /************************************************************************************/
    //publicly exposed private methods
    //  right now i have kept them public so they are easier to debug
    //  no reason to actually encapsulate them just yet
    /************************************************************************************/
    _setPreferences:function(prefs){
    	/************************
    	 *even though i am passing in these prefs, sanitized
    	 *i don't know how other's might pass crap in without thinking
    	 *so i'm very careful, this helps those sticking to using the 'public' methods
    	**************************/
    	var sap = this._preferences;
    	var propertynames = Object.getOwnPropertyNames(prefs);
    	for (var i = 0; i < propertynames.length; i++) {
        	var propt = propertynames[i];
        	if( typeof(sap[propt])!=="undefined" ){
				if(typeof(sap[propt])=="string"){
					sap[propt]= prefs[propt].toString();
				}
				else if(typeof(sap[propt])=="number"){
					sap[propt]= parseInt(prefs[propt]);
				}
				else if(typeof(sap[propt])=="boolean"){
					var bval=this._parsebool(prefs[propt]);
					sap[propt]=bval==true?true:false; 
				}
			}
    	}
    },
    _start:function(){
       	if(typeof(Worker)!=="undefined"){
			if(typeof(this.worker)=="undefined"){
				var snm = JSON.stringify(this.newmanifest).length;
       			if(snm > this._preferences.maxSize){
       				return;
       			}
				var stat = this._status;
				stat.runs++;
				stat.state='running';
				var tmsa = this._datearray();
				stat.started = tmsa[1] + '/' + tmsa[2] + '/' + tmsa[0] + 
   					' ' + tmsa[3] + ':' + tmsa[4] + ':' + tmsa[5] + '.' + tmsa[6];
   				var me = this; //used to reference inside callback
       			this.worker = new Worker(this.workerfile);
       			this.worker.onmessage=function(e){
       				switch(e.data.cmd){
       					case 'm':
       						me._statusupdate(e.data);
       						var proof = e.data.proofs[1];
       						//if this is not the first mani for this run
       						if(proof.m > 0){
       							//push it into the 'dump'
       							me._manadumppush(e);
       							//check if preferences to pass mani through to app
       							if(me._preferences.maniPassThrough){
       								me._postmsg(e.data,me._preferences.passThroughLogLevel);
       							}								
			       				//get size of manifest
			       				var snm = JSON.stringify(me.newmanifest).length;
			       				var tm = JSON.stringify(e.data).length;
								//if this puts us over the maxSize then we need to do some work
			       				if(snm+tm > me._preferences.maxSize){
			       					//first, stop webworker
			       					me._stop();
									//does user want autopackage?
				       				if(me._preferences.autoPackage){	
				       					me._package();
				       					me._postmsg({cmd:'autopackagecomplete'});
				       					//now, autosubmit the package?
				       					if(me._preferences.autoSubmit){
				       						me._commitpackage(me.packages.length-1);
				       					}
				       					//should we autorestart?
				       					if(me._preferences.autoRestart){
				       						me.start();
				       						me._postmsg({cmd:'autorestart'});
				       					}
				       				}
			       				} //end if maxsize
       						}//end auto userprefs stuff
       						//only push to manifst if it's the first mani
       						else if(proof.m == 0){
       							me._pushnewmanifest(e.data);
       						}
       						break;
   						case 'c':
   							//update status
   							me._statusupdate(e.data);
							var val = parseInt(e.data.npoe[5].substr(0,1),16);
							stat.common[e.data.rar].count++;
							stat.common[e.data.rar].melt+=val;
   							//push onto manifest (note, this also _postmsg back to app ui)
   							me._pushnewmanifest(e.data);
   							var label="";
   							switch(e.data.rar){
   								case 1:
   									label = "copperweight";
   									break;
   								case 2:
   									label = "silverweight";
   									break;
   								case 3:
   									label="goldenweight";
   									break;
   							}
							if(e.data.i[0]){
								me._trax("useritem", label, e.data.npoe[5]);
							}
   							if(e.data.i[1]){
   								me._trax("appitem", label, e.data.npoe[6]);
   							}
   							if(e.data.i[2]){
   								me._trax("realmitem", label, e.data.npoe[7]);
   							}
   							break;
						case 'r':
							//udpate the status
							me._statusupdate(e.data);
							var val = parseInt(e.data.npoe[5].substr(0,e.data.rar),16);
							stat.rare[0].count++;
							stat.rare[0].melt+=val;
							if(e.data.rar>stat.rare[0].high){
								rare[0].high = e.data.rar;
							}
							//track this with web analytics
							me._trax("yottagem","rewards",e.data.npoe[5],e.data.rar);
							//push onto manifest (note, this also _postmsg back to app ui)
							me._pushnewmanifest(e.data);
							break;
						case 'status':
							//pass along to APP UI
							me._postmsg(e.data);
							break;
						default:
							//pass along to APP UI
							me._postmsg(e.data);
							break;
       				}
       			};
       			this.worker.postMessage({cmd:'start',stub:this._stub,diffKey:this._diffKey,itemKey:this._itemKey});
       		} //end if this.worker undefined (not running)
       		else{
       			//dump('who pressed start?');
       			return;
       		}
       	}
       	else{
       		//dump('browser does not support web workers');
       		return;
       	}
	},
	_stop:function(){
		//var i = internal || false;
		if(typeof(this.worker)!=="undefined"){
 			this.worker.terminate();
 			this._status.state = 'idle';
 			this.worker=undefined;
 			var lastmana = this._manadump[this._manadump.length-1];
 			if(lastmana){
	 			lastmana.mana = JSON.parse(JSON.stringify(this._manadump[this._manadump.length-1]));
	 			this.newmanifest.push(lastmana);
	 		}
 			this._log('terminated.');
 		}
 		else {
 			this._log('main: worker not running, who called this._stop()?');
 		}
    },
    _package:function(){
    	var f = this.newmanifest[0];
    	var l = this.newmanifest[this.newmanifest.length-1];
    	var pk = {
    		altProfile:this._preferences.altProfile,
    		born:f.proofs[1].b,
    		id:parseInt(l.npoe[4],16),
    		runs:this._status.runs,
    		ver:this._apiversion,
    		manifest:this.newmanifest
    	};
    	var pkg = JSON.parse(JSON.stringify(pk));
    	this.packages.push(pkg);
    	this.newmanifest = [];
    	this._manadump = [];
    	this._resetstatus();
    	this._log('done packaging');
    },
	_commitpackage:function(idx){
		if(this.packages.length){
			var ithis = this;
			var indx = idx || 0;
			var pkg = this.packages[indx];
			if(pkg.pushes){pkg.pushes++;}else{pkg.pushes=1}
			var success = function(rt,s, retstatus,jsonobj,url,dt){
				ithis._trax("package","commit-success",pkg.id.toString(),dt);
				var notintotumbolia = ithis.packages.splice(indx,1)[0];
				ithis.submittedPackages.push(notintotumbolia);
				//return;
				ithis._postmsg({
					cmd:'commitsuccess',
					indx:indx, id:pkg.id,
					returned:{ s:s, rt:rt, retstatus:retstatus, jsonobj:jsonobj, url:url, dt:dt}
				});
			};
			var fail = function(rt,s,retstatus,jsonobj,url,dt){
				pkg.status='commitfailed';
				ithis._trax("package","commit-failure",s.toString(),dt);
				ithis._postmsg({
					cmd:'commitfail',
					indx:indx, pkg:pkg,
					returned:{s:s,rt:rt,retstatus:retstatus,jsonobj:jsonobj,url:url,dt:dt}
				});
				//todo:insert some fancy retry logic here (maybe)
			};
			//convert to JQuery as all iFrame embeds (even on Satoshi Web Client) will use Jquery(ui)
			//note this also opens up google, facebook, yahoo and other prominant apis to integrate
			this._postjsonobj(pkg,this._urls.commitPackage,success,fail,this);
		}
	},
	_deleteQueuedPackage:function(idx){
		var delpkg = this.packages.splice(idx,1)[0];
		this.deletedPackages.push(delpkg);
	},
	//best to keep width and height multiple of 3, no smaller than 9
	//returns a canvas, use as following example illustrates
	_get2DGem:function(mani,wdth,hght){
		w=wdth||18;h=hght||18;
		var tkn = mani.npoe[0];
		var rarity = mani.npoe[2].length + mani.npoe[3].length;
		rarity = rarity > 4 ? 4 : rarity;
		var arrBorders = ['red','#C69633','silver','gold','black'];
		var c = document.createElement('canvas');
		c.width=w<18?18:w; c.height=h<18?18:h;
		var ctx=c.getContext("2d");
		var pieces = tkn.match('(.{4})(.{6})' +
			'(.{6})(.{6})(.{6})(.{6})(.{6})(.{6})(.{6})(.{6})(.{6})'); //note: basically, an appid
		var tx = c.width <= c.height?((c.width-4)/2)+2:((c.height-4)/2)+2;
		
		if(rarity > 0){
			ctx.save();
			ctx.beginPath();
			ctx.arc( ((c.width-4)/2)+2, ((c.height-4)/2)+2, tx, 0, Math.PI*2, true); 
			ctx.closePath();
			ctx.clip();
		}			

		var brdr = arrBorders[rarity];
		ctx.strokeStyle = brdr;
		ctx.fillStyle= brdr;
		ctx.fillRect(0,0,c.width,c.height);

		for(var row=0;row<3;row++){
			for(var col=0;col<3;col++){
				var clr = '#' + pieces[2+col+(row*3)];
				ctx.fillStyle= clr;
				var x =((c.width-4) / 3 * col)+(col)+2;
				var y =((c.height-4) / 3 * row)+(row)+2;
				var dx = (((c.width-8)/3));
				var dy = (((c.height-8)/3));
				ctx.fillRect(x,y,dx,dy);
			}
		}
		var lw = ctx.lineWidth;
		if(rarity>0){
			ctx.strokeStyle = brdr;
			ctx.fillStyle= brdr;
			ctx.beginPath();
			ctx.lineWidth = 4;
			ctx.arc( ((c.width-4)/2)+2, ((c.height-4)/2)+2, tx-1, 0, Math.PI*2, true); 
			ctx.closePath();
			ctx.stroke();
		}
		ctx.lineWidth = lw;
		
		ctx.beginPath();
		var rad = c.width<=c.height?((c.width-4)/3/2)-1:((c.height-4)/3/2)-1;
		ctx.arc(((c.width-4)/2)+2, ((c.height-4)/2)+2, rad, 0, 2 * Math.PI, true);
		ctx.closePath();
		ctx.fillStyle = '#' + pieces[11];
		ctx.fill();
		
		ctx.restore();
		return c;
	},
    /*****************************************************************************************************
    http://www.quirksmode.org/js/detect.html
    must keep internal arrays up to order for browser-detect
    current as of March 5, 2013 
    *****************************************************************************************************/
	browserDetect : {
		init: function () {
			this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
			this.version = this.searchVersion(navigator.userAgent)
				|| this.searchVersion(navigator.appVersion)
				|| "an unknown version";
			this.OS = this.searchString(this.dataOS) || "an unknown OS";
		},
		searchString: function (data) {
			for (var i=0;i<data.length;i++)	{
				var dataString = data[i].string;
				var dataProp = data[i].prop;
				this.versionSearchString = data[i].versionSearch || data[i].identity;
				if (dataString) {
					if (dataString.indexOf(data[i].subString) != -1)
						return data[i].identity;
				}
				else if (dataProp)
					return data[i].identity;
			}
		},
		searchVersion: function (dataString) {
			var index = dataString.indexOf(this.versionSearchString);
			if (index == -1) return;
			return parseFloat(dataString.substring(index+this.versionSearchString.length+1));
		},
		dataBrowser: [
			{
				string: navigator.userAgent,
				subString: "Chrome",
				identity: "Chrome"
			},
			{ 	string: navigator.userAgent,
				subString: "OmniWeb",
				versionSearch: "OmniWeb/",
				identity: "OmniWeb"
			},
			{
				string: navigator.vendor,
				subString: "Apple",
				identity: "Safari",
				versionSearch: "Version"
			},
			{
				prop: window.opera,
				identity: "Opera",
				versionSearch: "Version"
			},
			{
				string: navigator.vendor,
				subString: "iCab",
				identity: "iCab"
			},
			{
				string: navigator.vendor,
				subString: "KDE",
				identity: "Konqueror"
			},
			{
				string: navigator.userAgent,
				subString: "Firefox",
				identity: "Firefox"
			},
			{
				string: navigator.vendor,
				subString: "Camino",
				identity: "Camino"
			},
			{		// for newer Netscapes (6+)
				string: navigator.userAgent,
				subString: "Netscape",
				identity: "Netscape"
			},
			{
				string: navigator.userAgent,
				subString: "MSIE",
				identity: "Explorer",
				versionSearch: "MSIE"
			},
			{
				string: navigator.userAgent,
				subString: "Gecko",
				identity: "Mozilla",
				versionSearch: "rv"
			},
			{ 		// for older Netscapes (4-)
				string: navigator.userAgent,
				subString: "Mozilla",
				identity: "Netscape",
				versionSearch: "Mozilla"
			}
		],
		dataOS : [
			{
				string: navigator.platform,
				subString: "Win",
				identity: "Windows"
			},
			{
				string: navigator.platform,
				subString: "Mac",
				identity: "Mac"
			},
			{
				   string: navigator.userAgent,
				   subString: "iPhone",
				   identity: "iPhone/iPod"
		    },
			{
				string: navigator.platform,
				subString: "Linux",
				identity: "Linux"
			}
		]
	
	},
	/************************************************************************************/
	//strictly internal functions
	//  again, they are not really internal/hidden yet for debugging purposes
	//  probably better to leave it exposed for developers anyway at this point
	/************************************************************************************/
	_postmsg:function(obj,lvl){
		//todo: make sure we 'loop-in' to 'broadcast'
		this._log(obj,lvl);
		if(typeof(this.onmsg)=="function"){
			this.onmsg(obj);
			this._broadcast(obj);
		}
	},
	_resetstatus:function(){
		this._status = {
		    	avgkopsec:0, //this uses total count over age
		    	age:0,
		    	c:0, //this gets HUGE :) total operations this run...
		    	dc:0,
		    	dt:0,
		    	hold:false,
		    	kopsec:0, //this uses dt/dc
		    	lastupdate:'Fri - 4:20AM', //just format for today's date and now time
		    	m:0,
		    	runs:0,
		    	rt:0,
		    	state:'idle',
		    	manicount:0,
		    	manisize:0,
		    	mops:0,
		    	//totalsize:0,
		    	started:'Fri - 4:20AM', //whatever
		    	runtime:0,
		    	common:[
		    		{name:'mana' ,count:0},
		    		{name:'cu' ,count:0,melt:0},
		    		{name:'ag' ,count:0,melt:0},
		    		{name:'au' ,count:0,melt:0}
		    	],
		    	rare:[
		    		{name:'rare',count:0,melt:0,high:0}
		    	]
		    };
	},
    _statusupdate:function(mani){
   		var proof = mani.proofs[1];
   		var stat = this._status;
   		stat.hold=true;
   		//stat.age = proof.age;
   		stat.c = proof.c;
   		//stat.avgkopsec = proof.c / (mani.proofs[1].b - mani.proofs[0].b);
   		stat.avgkopsec = (proof.dc/proof.dt).toFixed(1);
   		stat.dc = proof.dc; stat.dt = proof.dt;
   		stat.kopsec = proof.dc / proof.dt; //see, ops per milliseconds is kops per second :)
   		stat.m = proof.m;
   		stat.manicount=this.newmanifest.length;
   		stat.manisize=JSON.stringify(this.newmanifest).length;
   		stat.mops = (proof.c / 1e6).toFixed(1);
   		stat.rt = stat.rt + (mani.proofs[1].b - (mani.proofs[0].b||mani.proofs[1].b));
   		stat.runtime = this._ms2hms(stat.rt);
   		this._status.totalsize = this._status.pkgsize + this._status.manisize;
   		tmsa = this._datearray(mani.proofs[1].b);
   		stat.lastupdate = tmsa[1] + '/' + tmsa[2] + '/' + tmsa[0] + 
   			' ' + tmsa[3] + ':' + tmsa[4] + ':' + tmsa[5];
   		stat.hold=false;
    },
    _postjsonobj:function(jsonobj, url, successCB, failCB, innerthis){
	    var ithis = innerthis || this;
	    var hr = new XMLHttpRequest();
	    var success = typeof successCB == 'function' ? successCB : function(){return;};
	    var fail = typeof failCB == 'function' ? failCB : function(){return;};
	    jsonobj = typeof jsonobj !== 'undefined' ? jsonobj : [];
	    url = typeof url !== 'undefined' ? url : '/sha/package/commit'
	    var body = JSON.stringify(jsonobj);
	    hr.open("post", url, true);
	    hr.setRequestHeader("Content-type", "json");
	    var reqtms = new Date().getTime();
	    var dt = 0;
	    hr.onreadystatechange = function() {
		    if(hr.readyState == 4 && hr.status == 200) {
			    var return_data = hr.responseText;
			    dt = new Date().getTime() - reqtms;
				ithis._log({
					msgfrom:'_postjsonobj()',
					callback:'success',
					url:url,jsonobj:jsonobj,dt:dt}
				,2);
				var rt = JSON.parse(hr.responseText);
				success(rt,hr.status,return_data,jsonobj,url,dt);
		    }
		    else if(hr.readyState == 4 && hr.status !== 200){
		    	var return_data = hr.statusText;
		    	dt = new Date().getTime() - reqtms;
		    	ithis._log({
		    		msgfrom:'_postjsonobj()',
		    		callback:'fail',url:url,jsonobj:jsonobj,dt:dt,
		    		rt:rt}
		    	,2);
		    	var rt = JSON.parse(hr.responseText);
		    	fail(rt, hr.status, return_data,jsonobj,url,dt);
		    }
	    }
	    hr.send(body);
	    ithis._log({msgfrom:'_postjsonobj()',url:url,jsonobj:jsonobj,dt:dt});
	},
	_manadumppush: function(e){
		this._manadump.push(e.data); //this holds the full object
		var tmp = parseInt(e.data.npoe[5].substr(0,1),16);
		this._status.common[0].count++;
		//this._manahold.push(tmp); //or use val instead of fc, only holds the melt value
	},
	_pushnewmanifest:function(data){
   		//this._log(data);
   		this.newmanifest.push(data);
   		this._postmsg(data);
	},
    _log:function(msg,lvl){
    	var l = lvl || 0;
    	if(this._preferences.debug){
    		if(l < this._preferences.debugLevel){
    			console.log(msg);
    		}
    	}
    },
    _trax:function(category, action, opt_label, opt_value, opt_noninteraction){
    	var __gaq = window._gaq || [];
    	var cat = typeof category == "string" ? category : "err: " + typeof category;
    	var act = typeof action == "string" ? action : "err: " + typeof action;
    	var optlab = typeof opt_label == "string" ? opt_label : null;
    	var optval = typeof opt_value == "number" ? opt_value : null;
    	var optnonint = typeof opt_noninteraction == "boolean" ? opt_noninteraction : true;
    	var pe = ['_trackEvent', cat, act, optlab, optval, optnonint];
    	var __logmsg = JSON.stringify(pe);
    	__gaq.push(pe);
    	satoshiClient._log(__logmsg,1); 
    			//TODO: handle context better 
    				//(callback inside callback)
    				//this? not in some contexts
    				//me? only in one context
    				//need inner-namespace alias for root contexts
    				//or just use satoshiClient where appropriate
    				//meant to be static anyway :)
    },
    _parsebool:function(val){
		//excellent, custom parseBoolean
		if(typeof(val)=="string"){
			switch(val){
				case "false":
					return false;
				case "0":
					return false;
				case "":
					return false;
				case "-1":
					return false;
				//case "1": //only need to check for all possible 'false' values
				//	return true;
				//case "true": //so long as we tested everything else
				//	return true; //included below by default;
				default:
					return true;
			}
		}
		else if(typeof(val)=="number"){
			return parseInt(val)>0?true:false;
		}
		else if(typeof(val)=="boolean"){
			return val==true?true:false; //whew, that one was easy!
		}    		
	},
    _datearray:function(ms){ 
    	//this is going to get axed
		var ct = null;
		if(ms){
			ct= new Date(ms);
		}
		else{
			ct= new Date();
		}
		//var ct= new Date();
		return [
			ct.getFullYear(), zen(ct.getMonth()+1),zen(ct.getDate()), 
			zen(ct.getHours()), zen(ct.getMinutes()), zen(ct.getSeconds()), 
			ct.getMilliseconds()
		];
		function zen(mu){return (mu<10?'0':'')+mu;} //SHRDLU
	},
	_validate:function(mani){
		//this is going to get axed
		var ret = false;
		var hash = SHA256(JSON.stringify(mani.proofs[1]));
		//var mpatt = mani.proofs[1].dstr + this._itemKey;
	},
	_ms2hms:function(ms) {
		//my favorite function of all :)
  		var days = ms / 8.64e7 | 0;
  		var hrs  = (ms % 8.64e7)/ 3.6e6 | 0;
  		var mins = Math.round((ms % 3.6e6) / 6e4);
  		var sec = Math.round((ms % 6e4) / 1e3);
  		return zen(hrs) + ':' + zen(mins) + ':' + zen(sec); 
  		function zen(mu){return (mu<10?'0':'')+mu;} //SHRDLU
	}	
	/******************************************************************************/
}; //end satoshi object
/*********************************************************/