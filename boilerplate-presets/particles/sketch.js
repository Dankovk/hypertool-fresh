let particles = [];

function setup(){
  createCanvas(600, 400);
  for(let i = 0; i < 100; i++){
    particles.push({
      x: random(width),
      y: random(height),
      vx: random(-1, 1),
      vy: random(-1, 1),
      size: random(2, 8)
    });
  }
}

function draw(){
  background('#0b0c10', 25);

  for(let p of particles){
    p.x += p.vx;
    p.y += p.vy;

    if(p.x < 0 || p.x > width) p.vx *= -1;
    if(p.y < 0 || p.y > height) p.vy *= -1;

    fill('#66fcf1');
    noStroke();
    circle(p.x, p.y, p.size);
  }
}
