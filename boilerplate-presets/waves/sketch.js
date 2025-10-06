let t = 0;

function setup(){
  createCanvas(600, 400);
  strokeWeight(2);
}

function draw(){
  background('#0b0c10');

  stroke('#66fcf1');
  noFill();

  beginShape();
  for(let x = 0; x < width; x += 4){
    const y = height/2 + noise(x * 0.01, t) * 200 - 100;
    vertex(x, y);
  }
  endShape();

  stroke('#45a29e');
  beginShape();
  for(let x = 0; x < width; x += 4){
    const y = height/2 + noise(x * 0.01, t + 100) * 150 - 75;
    vertex(x, y);
  }
  endShape();

  t += 0.01;
}
