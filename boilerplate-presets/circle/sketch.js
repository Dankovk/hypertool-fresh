function setup(){
  createCanvas(600, 400);
}

function draw(){
  background('#0b0c10');
  stroke('#66fcf1');
  noFill();
  const r = 120 + 8 * sin(frameCount*0.05);
  circle(width/2, height/2, r*2);
}

