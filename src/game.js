(function () {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.requestAnimationFrame = requestAnimationFrame;
})();

var canvas = document.getElementById("gameCanvas");
var ctx = canvas.getContext('2d');
var keys = [];

var gameWidth = 720,
    gameHeight = 480;
var player = {
    x: gameWidth / 2,
    y: 200,
    width: 25,
    height: 25,
    speed: 3,
    velX: 0,
    velY: 0,
    color:'#3388FF'
}

canvas.width = gameWidth;
canvas.height = gameHeight;

ctx.fillStyle = 'Black';
ctx.fillRect(30, 20, 40, 40);
ctx.fillRect(110, 20, 40, 40);
ctx.fillRect(60, 180, 80, 80);

function update() {
    // check keys
    if (keys[38] || keys[87]) {
        // up arrow or w
        if (player.velY > -player.speed) {
            player.velY--;
        }
    }
    if (keys[40] || keys[83]) {
        // down arrow or S
        if (player.velY < player.speed) {
            player.velY++;
        }
    }
    if (keys[39] || keys[68]) {
        // right arrow
        if (player.velX < player.speed) {
            player.velX++;
        }
    }
    if (keys[37] || keys[65]) {
        // left arrow
        if (player.velX > -player.speed) {
            player.velX--;
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
