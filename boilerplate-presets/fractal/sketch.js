function setup(){
  createCanvas(600, 400);
  angleMode(DEGREES);
}

function draw(){
  background('#0b0c10');

  stroke('#66fcf1');
  strokeWeight(2);

  translate(width/2, height);

  const angle = map(mouseX, 0, width, 15, 45);
  const len = map(mouseY, 0, height, 50, 150);

  branch(len, angle);
}

function branch(len, angle){
  line(0, 0, 0, -len);
  translate(0, -len);

  if(len > 4){
    push();
    rotate(angle);
    branch(len * 0.67, angle);
    pop();

    push();
    rotate(-angle);
    branch(len * 0.67, angle);
    pop();
  }
}
