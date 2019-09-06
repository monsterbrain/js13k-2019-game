(function () {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.requestAnimationFrame = requestAnimationFrame;
})();

var canvas = document.getElementById("gameCanvas");
var ctx = canvas.getContext('2d');
var keys = [];

var storedPosArray = [];

var frameTimer = 0.0;
var keyFrameStepDuration = 200; //ms

const LEFT = 0, RIGHT = 1, UP = 2, DOWN = 3, UPDOWN = 4, LEFTRIGHT = 5;

var gameWidth = 720, gameHeight = 480;

var player = {
    x: gameWidth / 2,
    y: 200,
    width: 25,
    height: 25,
    speed: 3,
    velX: 0,
    velY: 0,
    accel: 2,
    color:'#3388FF'
}

var enemy = {
    x: gameWidth / 4,
    y: 200,
    width: 25,
    height: 25,
    speed: 3,
    velX: 0,
    velY: 0,
    accel: 2,
    color:'#ff3355',
    dir: RIGHT,
    patrolDir: UPDOWN,
    patrolTimer: 0,
    patrolDuration: 2000 //ms
}

class Enemy {
    patrolTimer = 0
    patrolDuration = 2000
    patrolDir = UPDOWN
    constructor(x, y, w, h, speed, dir, color){
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.speed = speed
        this.dir = dir
        this.color = color
    }

    update(dt){
        if(dt)
            this.y -= this.speed*(dt/1000)
    }

    render(ctx){
        ctx.fill();
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

canvas.width = gameWidth;
canvas.height = gameHeight;

ctx.fillStyle = 'Black';
ctx.fillRect(30, 20, 40, 40);
ctx.fillRect(110, 20, 40, 40);
ctx.fillRect(60, 180, 80, 80);

var isStoringActive = true;
var isRewindActive = false;

var rewindStep = 0;
var prevPos, nextPos;

var enemyTest = new Enemy(100,200, 25, 25, 10, UP, '#ff4433')

function tweenPos(dt, duration) {
    var pos = {}
    pos.x = startPos.x + (endPos.x - startPos.x)*(dt/duration)
    pos.y = startPos.y + (endPos.y - startPos.y)*(dt/duration)
    return pos
}

var lastTime, deltaTime=0;
function update(currentTime) {

    if(lastTime==undefined) {
        lastTime=currentTime;
    }

    deltaTime=(currentTime-lastTime);
    lastTime=currentTime;

    if(deltaTime) {
        if(isStoringActive) {
            frameTimer += deltaTime;
            // console.log(frameTimer);
            if(frameTimer>keyFrameStepDuration){
                frameTimer = frameTimer - keyFrameStepDuration;
                storedPosArray.push({x:player.x, y:player.y});
                // console.log(storedPosArray);
            }
        } else if(isRewindActive){
            frameTimer += deltaTime;
            // console.log(frameTimer);
            var newPos = tweenPos(frameTimer, keyFrameStepDuration)
            player.x = newPos.x;
            player.y = newPos.y;
            if(frameTimer>keyFrameStepDuration){
                frameTimer = frameTimer - keyFrameStepDuration;
                try
                {
                    // player.x = storedPosArray[rewindStep].x;
                    // player.y = storedPosArray[rewindStep].y;
                    rewindStep --;
                    startPos = storedPosArray[rewindStep]
                    endPos = storedPosArray[rewindStep-1]
                } catch(e) {
                    console.log(e);
                }
            }
        }
    }
    
    

    var cheatRewind = true;
    // check keys
    if (cheatRewind && !isRewindActive && keys[32]) {
        // space to rewind
        isStoringActive = false
        isRewindActive = true
        rewindStep = storedPosArray.length-1
        startPos = storedPosArray[rewindStep]
        endPos = storedPosArray[rewindStep-1]
    }

    if (keys[38] || keys[87]) {
        // up arrow or w
        if (player.velY > -player.speed) {
            player.velY -= player.accel;
        }
    }
    if (keys[40] || keys[83]) {
        // down arrow or S
        if (player.velY < player.speed) {
            player.velY+=player.accel;
        }
    }
    if (keys[39] || keys[68]) {
        // right arrow
        if (player.velX < player.speed) {
            player.velX+= player.accel;
        }
    }
    if (keys[37] || keys[65]) {
        // left arrow
        if (player.velX > -player.speed) {
            player.velX-=player.accel;
        }
    }
    
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    ctx.beginPath();

    player.x += player.velX;
    player.y += player.velY;

    player.velX = player.velY = 0

    ctx.fill();//Draw charater stuff
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    enemyTest.update(deltaTime)
    enemyTest.render(ctx)

    // draw enemy stuff
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

    if(collides(player, enemy)){
        console.log("enemy hit");
    }

    requestAnimationFrame(update);
}

// resizing and loading windows
window.addEventListener('load', onLoad, false);
window.addEventListener('resize', resize, false);

document.body.addEventListener("keydown", function (e) {
    keys[e.keyCode] = true;
});

document.body.addEventListener("keyup", function (e) {
    keys[e.keyCode] = false;
});

// ref : http://jeffreythompson.org/collision-detection/rect-rect.php
function collides(r1, r2) {
    var collided = false;
    //Is the RIGHT edge of r1 to the RIGHT of the LEFT edge of r2?
    if(r1.x+r1.width >= r2.x &&
        r1.x<=r2.x+r2.width &&
        r1.y+r1.height >= r2.y &&
        r1.y<=r2.y+r2.height){
            collided = true;
        }
    // Is the LEFT edge of r1 to the LEFT of the RIGHT edge of r2?
    // Is the BOTTOM edge of r1 BELOW the TOP edge of r2?
    // Is the TOP edge of r1 ABOVE the BOTTOM edge of r2?
    
    return collided;
}

function onLoad(){
    resize();
    update();
}

function resize() {
    // todo get the width of game area
    // Resize the window, not the pen
    // Our canvas must cover full height of screen
    // regardless of the resolution
    var height = window.innerHeight;
  
    // So we need to calculate the proper scaled width
    // that should work well with every resolution
    var ratio = canvas.width / canvas.height;
    var width = height * ratio;
  
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
}
