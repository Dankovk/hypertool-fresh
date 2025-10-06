function setup(){
  createCanvas(600, 400);
  noLoop();
}

function draw(){
  background('#0b0c10');

  const gridSize = 30;
  const cols = floor(width / gridSize);
  const rows = floor(height / gridSize);

  for(let i = 0; i < cols; i++){
    for(let j = 0; j < rows; j++){
      const x = i * gridSize + gridSize/2;
      const y = j * gridSize + gridSize/2;

      const r = random(1);

      push();
      translate(x, y);

      if(r < 0.5){
        stroke('#66fcf1');
        strokeWeight(2);
        line(-gridSize/3, -gridSize/3, gridSize/3, gridSize/3);
      } else {
        stroke('#45a29e');
        strokeWeight(2);
        line(-gridSize/3, gridSize/3, gridSize/3, -gridSize/3);
      }

      pop();
    }
  }
}

function mousePressed(){
  redraw();
}
