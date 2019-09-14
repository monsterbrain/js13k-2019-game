// v 0.5 updated 12-10-19 - 11 am
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

const REWIND_LVL_KEY='rewind_level_key';
var level = parseInt(localStorage.getItem(REWIND_LVL_KEY)||'0')
var enemies = []
 
var player = {
    x: gameWidth / 2,
    y: 200,
    w: 25,
    h: 25,
    dir: -1,
    speed: 5,
    velX: 0,
    velY: 0,
    accel: 2,
    color:'#3388FF'
}
 
class Joystick {
  constructor(x,y,cr){
    this.inx = x
    this.iny = y
    this.cx = x
    this.cy = y
    this.cr = cr
    this.inR = 10
  }
 
  getDir(mx, my){
    var dist = (this.cx-mx)*(this.cx-mx)+(this.cy-my)*(this.cy-my)
    if(dist<=(this.cr*this.cr)){
      console.log("inside touch")
      var ang = Math.atan2(my-this.cy, mx-this.cx)*180/Math.PI
      console.log("ang = "+ang)

      this.inx = mx
      this.iny = my
     
      if(ang<45 && ang>-45)
          return RIGHT
      else if(ang>-135 && ang <-45)
          return UP
      else if(ang<135 && ang>=45)
          return DOWN
      else
          return LEFT
    }
    return -1
  }

  reset(){
    this.inx = this.cx
    this.iny = this.cy
  }
 
  draw(ctx){
      ctx.beginPath();
    ctx.fillStyle = "rgba(80, 80, 80, 0.25)";
    ctx.arc(this.cx, this.cy, this.cr, 0, 2 * Math.PI, false);
    ctx.fill();
    // inner joystick
    ctx.beginPath();
    ctx.fillStyle = "#333333";
    ctx.arc(this.inx, this.iny, this.inR, 0, 2 * Math.PI, false);
    ctx.fill();
  }
}

class Box {
    // common stuff
    constructor(x, y, w, h, dir, color){
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.dir = dir
        this.color = color
    }
}

class Gem extends Box{
    render(ctx){
        ctx.fillStyle = this.color;
        drawTria(ctx, 
            (this.x+this.w/2), this.y,
            this.x+this.w, this.y+this.h,
            this.x, this.y+this.h);
        if(this.stroked){
            ctx.lineWidth = 4;
            ctx.strokeStyle = this.color;
            ctx.stroke();
        }else {
            ctx.fill();
        }
    }
}

function drawTria(ctx, x1, y1, x2, y2, x3, y3){
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
}
 
class Enemy extends Box {
    constructor(x, y, w, h, speed, dir, patDuration, color){
        super(x, y, w,h, dir, color)
        this.speed = speed
        this.patrolTimer = 0
        this.patrolDuration = patDuration
        this.patrolDir = UPDOWN
    }
 
    update(dt){
        if(dt && this.patrolDuration>0){
            let disp = this.speed*(dt/1000)
            if(this.patrolDir == UPDOWN){
                this.y -= (this.dir == UP? disp: -disp)
            } else {
                this.x -= (this.dir == LEFT? disp: -disp)
            }
           
            this.patrolTimer += dt
            if(this.patrolTimer>this.patrolDuration){
                this.patrolTimer -= this.patrolDuration;
                if(this.patrolDir == UPDOWN){
                    this.dir = this.dir == UP? DOWN: UP;
                } else {
                    this.dir = this.dir == LEFT? RIGHT: LEFT;
                }
            }
        }
    }
 
    render(ctx){
        ctx.fill();
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

class UI{
    constructor(){
        this.isRecording = false
        this.isReplaying = false
    }

    render(ctx){
        ctx.beginPath();
        if(this.isRecording){
            ctx.fillStyle = "#ff5555";
            ctx.arc(680, 40, 20, 0, 2 * Math.PI, false);
            ctx.fill();
            drawText(ctx, '#f00', 'Recording..', 620, 90)
        }else if(this.isReplaying){
            ctx.fillStyle = "#ff5555";
            drawTria(ctx, 640,5, 608,40, 640,70)
            drawTria(ctx, 690,5, 658,40, 700,70)
            ctx.fill();
            drawText(ctx, '#f00', 'Rewinding..', 620, 90)
        }
        if(isGameWon || isGameOver){
            drawText(ctx, '#000', isGameWon?'-LEVEL WON-':'-GAME OVER-', 320, 240)
            drawText(ctx, '#000', '-Press R or Reload page to '+(isGameWon?'load next level-':'restart-'), 240, 260)
        }
        drawText(ctx, '#000', 'Level-'+(level+1), 320, 50)
    }
}
 
canvas.width = gameWidth;
canvas.height = gameHeight;
 
var isStoringActive = false;
var isRewindActive = false;
 
var rewindStep = 0;
var prevPos, nextPos;
 
var enemyTest = new Enemy(100,200, 25, 25, 200, UP, 0, '#ff4433')
var joystick = new Joystick(600, 360, 120)
var gameUI = new UI()

var startPoint, endPoint;

var isGameOver = false, isGameWon = false;
 
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
            try{
                var newPos = tweenPos(frameTimer, keyFrameStepDuration)
                player.x = newPos.x;
                player.y = newPos.y;
                if(frameTimer>keyFrameStepDuration){
                    frameTimer = frameTimer - keyFrameStepDuration;
                    
                    rewindStep--;
                    if(rewindStep<=0){
                        isRewindActive = false
                    }else{
                        startPos = storedPosArray[rewindStep];
                        endPos = storedPosArray[rewindStep-1];
                    }
                }
            } catch(e) {
                console.log(e);
            }
        }
    }
 
    var cheatRewind = false;
    // check keys
    if (cheatRewind && !isRewindActive && keys[32]) {
        // space to rewind
        isStoringActive = false
        isRewindActive = true
        rewindStep = storedPosArray.length-1
        startPos = storedPosArray[rewindStep]
        endPos = storedPosArray[rewindStep-1]
    }

    ctx.clearRect(0, 0, gameWidth, gameHeight);

    if(isGameOver){
        if (keys[82]){
            location.reload()
        }
        gameUI.render(ctx)
        requestAnimationFrame(update);
        return;
    }

    if (keys[67]){ //c to clear local storage
        localStorage.setItem(REWIND_LVL_KEY,'0')
    }
 
    var anyKeyDown = false
    if (keys[38] || keys[87]) {
        // up arrow or w
        player.dir = UP
    }
    if (keys[40] || keys[83]) {
        // down arrow or S
        player.dir = DOWN
    }
    if (keys[39] || keys[68]) {
        // right arrow
        player.dir = RIGHT
    }
    if (keys[37] || keys[65]) {
        // left arrow
        player.dir = LEFT
    }

    if(isRewindActive){
        player.dir = -1
    }
   
    if(player.dir == UP){
        if (player.velY > -player.speed) {
            player.velY -= player.accel;
        }
    } else if(player.dir == RIGHT){
        if (player.velX < player.speed) {
            player.velX+= player.accel;
        }
    } else if(player.dir == DOWN){
        if (player.velY < player.speed) {
            player.velY+=player.accel;
        }
    } else if(player.dir == LEFT){
        if (player.velX > -player.speed) {
            player.velX-=player.accel;
        }
    }

    if(player.dir>-1 && !isStoringActive) {
        isStoringActive = true
        gameUI.isRecording = true
    }

    if(!isMouseDown)
        player.dir = -1 // reset player movement
   
    ctx.beginPath();
 
    player.x += player.velX;
    player.y += player.velY;
 
    player.velX = player.velY = 0
 
    ctx.fill();//Draw charater stuff
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.w, player.h);
 
    // draw enemy stuff
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        enemy.update(deltaTime)
        enemy.render(ctx)

        if(collides(player, enemy)){
            console.log("enemy hit");
            isGameOver = true
            isStoringActive = false;
            isRewindActive = false;
            gameUI.isRecording = false
            gameUI.isReplaying = false
        }
    }

    startPoint.render(ctx)
    endPoint.render(ctx)
    
    joystick.draw(ctx)

    drawText(ctx, '#222', 'works best in landscape!', 5, 455)
    drawText(ctx, '#222', 'controls : arrow keys/wasd/joystick', 5, 435)
    drawText(ctx, '#222', 'touch the green Gem', 5, 405)
    gameUI.render(ctx)
 
    
 
    if(isStoringActive && collides(player, endPoint)){
        console.log("end hit");
        isStoringActive = false;
        isRewindActive = true;
        gameUI.isRecording = false
        gameUI.isReplaying = true
        rewindStep = storedPosArray.length-1
        startPos = storedPosArray[rewindStep]
        endPos = storedPosArray[rewindStep-1]

        startPoint.color = 'green'
        endPoint.color = 'grey'
        endPoint.stroked = true
        startPoint.stroked = false
    } else if(isRewindActive && collides(player, startPoint)){
        localStorage.setItem(REWIND_LVL_KEY,''+(level+1))
        isGameOver = true;
        isGameWon = true;
    }
 
    requestAnimationFrame(update);
}

const enemyColor = '#ff2233'

function loadLevel(){
    enemies.push(new Enemy(120, 0, 440, 140, 0, UP, 0, enemyColor))
    enemies.push(new Enemy(120, 360, 440, 140, 0, UP, 0, enemyColor))

    startPoint = new Gem(60, 210, 80, 80, UP, 'grey')
    startPoint.stroked = true
    endPoint = new Gem(620, 210, 80, 80, UP, 'green')

    player.x = 85;
    player.y = 250;

  if(level==0){
    // moving
    enemies.push(new Enemy(320, 145, 40, 40, 50, DOWN, 3000, enemyColor))
  }else if(level==1){
    enemies.push(new Enemy(220, 145, 40, 40, 80, DOWN, 2000, enemyColor))
    enemies.push(new Enemy(420, 360, 40, 40, 80, UP, 2000, enemyColor))
  }else if(level==2){
    
  }
}

function drawText(ctx, color, text, x, y){
    ctx.font = '20px sans-serif'; //bold italic
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
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
 
var isMouseDown = false;
canvas.addEventListener("mousedown",(e)=>{
  var rect = canvas.getBoundingClientRect()
  var pos = getMousePos(canvas, e)
  console.log(pos.x+","+pos.y)
  player.dir = joystick.getDir(pos.x, pos.y)
  isMouseDown = true;
})

canvas.addEventListener("mouseup",(e)=>{
    player.dir = -1
    isMouseDown = false;
    joystick.reset()
})
// ref http://bencentra.com/code/2014/12/05/html5-canvas-touch-events.html
// Set up touch events for mobile, etc
canvas.addEventListener("touchstart", function (e) {
    onTouched(e)
}, false);
canvas.addEventListener("touchend", function (e) {
    var mouseEvent = new MouseEvent("mouseup", {});
    canvas.dispatchEvent(mouseEvent);
}, false);
canvas.addEventListener("touchmove", function (e) {
    onTouched(e)
  }, false);

  function onTouched(e){
    mousePos = getMousePos(canvas, e);
    var touch = e.touches[0];
    var mouseEvent = new MouseEvent("mousedown", {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
  }
 
 
// ref : http://jeffreythompson.org/collision-detection/rect-rect.php
function collides(r1, r2) {
    var collided = false;
    //Is the RIGHT edge of r1 to the RIGHT of the LEFT edge of r2?
    if(r1.x+r1.w >= r2.x &&
        r1.x<=r2.x+r2.w &&
        r1.y+r1.h >= r2.y &&
        r1.y<=r2.y+r2.h){
            collided = true;
        }
    // Is the LEFT edge of r1 to the LEFT of the RIGHT edge of r2?
    // Is the BOTTOM edge of r1 BELOW the TOP edge of r2?
    // Is the TOP edge of r1 ABOVE the BOTTOM edge of r2?
   
    return collided;
}
 
function onLoad(){
    //resize();
    loadLevel()
    update();
}
 
function resize() {
    // todo get the width of game area
    // Resize the window, not the pen
    // Our canvas must cover full height of screen
    // regardless of the resolution
    console.log("resize")

    var {innerHeight, innerWidth} = window
    var height = (innerWidth>innerHeight)? innerHeight: innerWidth;
 
    // So we need to calculate the proper scaled width
    // that should work well with every resolution
    var ratio = canvas.width / canvas.height;
    var width = height * ratio;
   
    console.log(width+","+height)
 
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
}
 
function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
    y: (evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
  };
}
