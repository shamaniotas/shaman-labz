/*Copyright (c) 2012 Andrew Mason

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */


/**
* Missile Commnad HTML5 JavaScript clone
*
* @author Andrew Mason
* @contact andrew@coderonfire.com
*
*/

var MC = MC || (function() {
    var engine = (function() {
        // Private variables protected by closure
        var FPS = 1000 / 30,
        _canvas = document.querySelector('canvas'),
        _ctx = _canvas.getContext('2d'),
        _width = _canvas.width || _canvas.style.width,
        _height = _canvas.height || _canvas.style.height,
        _gradient = _ctx.createLinearGradient(_width / 2, 0, _width / 2, _height),
        _level = 0,
        _new_missile = 10000,
        _missiles_created = 0,
        _missiles_destroyed = 0,
        _gameInterval,
        _entities = {
            'missiles': [],
            'targets': [],
            'rockets': [],
            'turret': null
        },
        _levels = [];

        /**
		* Start the game
		*/
        function run() {
            startWave();
            Wave.init();
            _gameInterval = setInterval(_gameLoop, FPS);
        }
        
        function startWave() {
            _new_missile = 0;
            _missiles_created = 0;
            _missiles_destroyed = 0;
        }
        
        /**
		* Pause game
		*/
        function _pause() {
            clearInterval(_gameInterval);
        }
        
        // Setup click/touch events
        _canvas.addEventListener('click', launchRocket, false);

        //satoshi.onmessage.addEventListener('onmessage',addmissile,false);
        //var audio = document.getElementById('efxLaser1');
        
        function dosound(file_wo_extension){
	        var audio = document.createElement("audio");
			if (audio != null && audio.canPlayType && audio.canPlayType("audio/mpeg")){
				audio.src = "/sounds/mp3/" + file_wo_extension + ".mp3";
				audio.play();
			}
			else if (audio != null && audio.canPlayType && audio.canPlayType("audio/ogg")){
				audio.src = "/sounds/ogg/" + file_wo_extension + ".ogg";
				audio.play();
			}
        }
        
        function launchRocket(event) {
			dosound('Laser1');
            var target = {
                'x': event.clientX - this.offsetLeft,
                'y': event.clientY - this.offsetTop
            };
            
            _entities.rockets.push(new Rocket(
                target,
                {
                    'x': _entities.turret.pos.x + (_entities.turret.width / 2),
                    'y': _entities.turret.pos.y
                }
            ));
            
            //laser26.play();
        }
        //added by illara 
        //var laser26 = new Audio("/sounds/Laser26.mp3");
        //var laser864 = new Audio("/sounds/Laser864.mp3");
        

        /**
		* Game loop
		*/
		function addmissiles(clr, sz){
			//function Missle(origin, target, speed, colour, size)
			// Add missiles
			//if(!MISSILES_ARRAY.length){return;}
			//var val = MISSILES_ARRAY.shift();
			var str = 'Beep' + (sz || '1');
			dosound(str);
            _entities.missiles.push(new Missile(false, false, Wave.getWave(_level).MissileSpeed,clr,sz));
            _missiles_created += 1;
            _new_missile += Wave.getWave(_level).TimeBetweenShots;
            _new_missile -= FPS;
		}
		
        function _gameLoop() {
            // Wave end?
            if (_missiles_destroyed === Wave.getWave(_level).MissilesToDetroy) {
                _level += 1;
                startWave();
            }
        	
        
            // Clear the stage
            _ctx.fillStyle = _gradient;
            _ctx.fillRect(0, 0, _width, _height);

            // Move missiles & rockets
            _moveEntities(_entities.missiles);
            var count = _entities.rockets.length;
            for (var i = 0; i < count; i++) {
                _entities.rockets[i].move();
            }

            // Draw entities to the canvas
            _drawEntities(_entities.targets);
            _drawEntities(_entities.missiles);
            _drawEntities(_entities.rockets);
            
            // Draw debug information
            debugInfo();
        }
        
        function debugInfo() {
            _ctx.fillStyle = 'rgb(255, 255, 255)';
            _ctx.fillText(
                'Missile launched = ' + _missiles_created + '/' + Wave.getWave(_level).MissilesToDetroy,
                10, 20
            );
            _ctx.fillText('Level = ' + _level, 10, 30);
        }

        /**
		* Draw each entity to the canvas
		*
		* @param {array} entities All the game entities.
		*/
        function _drawEntities(entities) {
            for (var i = 0; i < entities.length; i++) {
                entities[i].draw(_ctx);
                
                // @TODO Move rockets out somewhere better
                if (entities[i].currentRadius <= 1 && !entities[i].expanding) {
                    entities.splice(i, 1); //aha! too tumbolia!! ~shaman iotas Feb 5, 2013 7:18 am
                }
            }
        }

        /**
		* Move each entity to the canvas
		*
		* @param {array} entities all the game entities.
		*/
        function _moveEntities(entities) {
            var count = entities.length;
            for (var i = 0; i < count; i++) {
                entities[i].move();
                
                // Check for collision
                // @TODO: Split the two hits into different sections
                var hhre = hasHitRocketExplosion(entities[i]);
                var hh =  entities[i].hasHit();
                if ( hhre || hh) {
                	if(hhre){
                		dosound('Boom3');
                		dosound('Boom1');
                	}
                	else{
                		var filstr = 'Hit' + parseInt(Math.random()*3);
            			dosound(filstr);
                	}
                	
                    // Remove the missile
                    entities.splice(i, 1);
                    count -= 1;
                    // Note the destroyed missile
                    _missiles_destroyed += 1;
                    // Reset missile timer to trigger creation of new missile
                    _new_missile = 0;
                }
                
                // Pause the game if there's no missiles
                if (_entities.missiles.length <= 0) {
                   // _pause();
                }
            }
        }
        
        /**
		* Check if a missile hit a rocket explosion.
		*
		* @param {object} missile.
		* @return {bool} Boolean verdict.
		*/
        function hasHitRocketExplosion(missile) {
            for (var i = 0; i < _entities.rockets.length; i++) {
                var x = _entities.rockets[i].pos.x - missile.pos.x,
                    y = _entities.rockets[i].pos.y - missile.pos.y;
                    
                var dist = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
                
                if (dist < _entities.rockets[i].currentRadius) {
                    return true;
                }
            }
            return false;
        }

        /**
		* Load and setup a level
		*
		* @param {object} level Level data.
		*/
        function loadLevel(level) {
            // Add game entities
            _entities.turret = new Turret(_width, _height);
            _entities.targets.push(_entities.turret);
            for (var i = 0; i < level.homes.length; i++) {
                _entities.targets.push(new Home(level.homes[i]));
            }

            // Set background gradient
            for (var i = 0; i < level.background.length; i++) {
                _gradient.addColorStop(
                    level.background[i].position,
                    level.background[i].colour
                );
            }

        }

        /**
		* Get random target location
		*
		* @return {object} Target's location.
		*/
        function getRandomTarget() {
            var targetCount = _entities.targets.length;
            var rndIndex = Math.floor(targetCount * Math.random());
            var target = _entities.targets[rndIndex];

            return target;
        }
        
        
        /*
		* @return {float} Width of the canvas
		*/
        function getWidth() {
            return _width;
        }

        // Expose public methods
        return {
            'loadLevel': loadLevel,
            'getWidth': getWidth,
            'getRandomTarget': getRandomTarget,
            'launchRocket': launchRocket,
            'run': run,
            'pause':_pause,
            'addmissiles':addmissiles,
            'dosound':dosound
        };
    }());
    
    
    var Wave = (function() {
        var TOTAL_WAVE_NUM = 40,
            _waves = [];
        
        /**
		* Sets up the missile waves
		*/
        function init() {
            for (var i = 0; i < TOTAL_WAVE_NUM; i++) {
                _waves[i] = {
                    'MissilesToDetroy': 10 + i,
                    'MirvChance': 30 + i * 4,
                    'BombChance': i * 2,
                    'FlyerChance': 5,
                    'TimeBetweenShots': 3000 - i * 200,
                    'MissileSpeed': 1.9 + (i / 4)
                };
            }
        }
        
		/**
		* Get the wave
		*/
        function getWave(level) {
            return _waves[level];
        }
        
        return {
            'init': init,
            'getWave': getWave
        };
    }());


    /**
	* Game entity class.
	*/
    var Entity = function Entity() {};

    /**
	* Draw the game entity on the canvas
	*
	* @param {elm} ctx Canvas context.
	*/
    Entity.prototype.draw = function(ctx) {
        ctx.fillStyle = this.colour;
        ctx.fillRect(
            this.pos.x,
            this.pos.y,
            this.width,
            this.height
        );
    };

    /**
	* Turret launcher class
	*
	* @param {object} pos Location position.
	*/
    var Turret = function Turret(width, height) {
       this.width = 20;
       this.height = 20;
       this.pos = {
        'x': (width / 2) - (this.width / 2),
        'y': 530
       };
       this.colour = 'rgb(255, 0, 0)';
    };
    Turret.prototype = new Entity();

    /**
	* Home entity class
	*
	* @param {object} pos Location position.
	*/
    var Home = function Home(pos) {
       this.pos = pos;
       this.width = 20;
       this.height = 10;
       this.colour = 'rgb(0, 100, 250)';
    };
    Home.prototype = new Entity();

    /**
	* Missile class
	*
	* @param {object} origin Starting position.
	* @param {object} target Target destination position.
	*/
    var Missile = function Missle(origin, target, speed, colour, size) {
        this.pos = {};
        this.origin = origin || {
            'x': engine.getWidth() * Math.random(),
            'y': 0
        };
        
        this.target = target || engine.getRandomTarget();
        
        // Calculate angle
        var x = (this.target.pos.x + this.target.width / 2) - this.origin.x;
        var y = this.target.pos.y - this.origin.y;
        this.angle = Math.atan(x / y);

        var color = 'rgb(' + parseInt(Math.random()*255) + ',' 
        	+ parseInt(Math.random()*255) + ',' + parseInt(Math.random()*255) + ')';
        this.colour = colour || color;
        this.speed = speed;
        this.distance = 0;
        this.sz = size || 1;
    };

    Missile.prototype.draw = function(ctx) {
        ctx.strokeStyle = this.colour;
        ctx.lineWidth = this.sz;
        ctx.beginPath();
        ctx.moveTo(this.origin.x, this.origin.y);
        ctx.lineTo(
            this.pos.x,
            this.pos.y
        );
        ctx.closePath();
        ctx.stroke();
    };

    Missile.prototype.move = function() {
        this.distance += this.speed;
        this.pos.x = Math.sin(this.angle) * this.distance + this.origin.x;
        this.pos.y = Math.cos(this.angle) * this.distance + this.origin.y;
    };
    
    Missile.prototype.hasHit = function() {
        if (this.pos.x >= this.target.pos.x &&
            this.pos.y >= this.target.pos.y &&
            this.pos.y <= this.target.pos.y + this.target.width
        ) {
            return true;
        } else {
            return false;
        }
        
        
    };
    
    var Rocket = function Rocket(target, origin) {
        this.fullRadius = 30;
        this.currentRadius = 0;
        this.expanding = true;
        this.explosionSpeed = 2;
        this.exploded = false;
        this.speed = 10;
        this.distance = 0;
        
        this.target = target;
        
        // @TODO: Weird turret reference issue causing red turrets to move
        this.origin = origin;
        this.pos = {x: origin.x, y:origin.y};
        
        // Calculate angle
        var x = this.target.x - this.origin.x;
        var y = this.target.y - this.origin.y;
        this.angle = Math.atan(x / y);
        
    };
    
    /* Some comment.
	*
	*/
    Rocket.prototype.move = function() {
        if (this.exploded) {
            return;
        }
        
        this.distance -= this.speed;
        
        this.pos.x = Math.sin(this.angle) * this.distance + this.origin.x;
        this.pos.y = Math.cos(this.angle) * this.distance + this.origin.y;
        
        if (this.pos.y < this.target.y) {
            this.exploded = true;
            engine.dosound('Boom2');
        }
    };
    
    Rocket.prototype.draw = function(ctx) {
        if (this.exploded) {
            if (this.expanding) {
                this.currentRadius += this.explosionSpeed;
                
                if (this.currentRadius >= this.fullRadius) {
                    this.expanding = false;
                }
            } else {
                this.currentRadius -= this.explosionSpeed;
            }
            
            var color = 'rgb(' + parseInt(Math.random()*255) + ',' 
        		+ parseInt(Math.random()*255) + ',' + parseInt(Math.random()*255) + ')';
            //ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillStyle = color;
            ctx.beginPath();
            //note: added by iotas feb 5, 2013
            ctx.arc(this.pos.x, this.pos.y, parseInt(Math.random() * this.currentRadius), 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.strokeStyle = 'rgb(255, 255, 255)';
            ctx.beginPath();
            ctx.moveTo(this.origin.x, this.origin.y);
            ctx.lineTo(
                this.pos.x,
                this.pos.y
            );
            ctx.closePath();
            ctx.stroke();
        }
    };


    /**
	* Levels
	*/
    var levels = [];
    levels[0] = {
        'homes': [
            { 'x': 55, 'y': 520 },
            { 'x': 105, 'y': 535 },
            { 'x': 158, 'y': 525 },
            { 'x': 270, 'y': 530 },
            { 'x': 325, 'y': 525 },
            { 'x': 390, 'y': 520 }
        ],
        'background': [
            {'colour': 'rgb(0, 5, 20)', 'position': 0},
            {'colour': 'rgb(0, 30, 70)', 'position': 0.7},
            {'colour': 'rgb(0, 60, 120)', 'position': 1}
        ],
        'rocketCount': 5,
        'attackRate': 1,
        'timer': 30
    };

    function init() {
        engine.loadLevel(levels[0]);
        //engine.run();
    }
    
    return {
        'init': init,
        'run':engine.run,
        'pauseit':engine.pause,
        'addmissiles':engine.addmissiles,
        'dosound':engine.dosound
    };

}());

MC.init();