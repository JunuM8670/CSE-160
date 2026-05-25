class Camera {
  constructor(canvas) {
    this.eye = new Vector3([14, 8, -15]);
    this.at = new Vector3([14, 1.2, -9]);
    this.up = new Vector3([0, 1, 0]);

    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();

    this.updateView();

    this.projectionMatrix.setPerspective(
      60,
      canvas.width / canvas.height,
      0.1,
      1000
    );
  }

    updateView(){
        this.viewMatrix.setLookAt(
            this.eye.elements[0],
            this.eye.elements[1],
            this.eye.elements[2],

            this.at.elements[0],
            this.at.elements[1],
            this.at.elements[2],

            this.up.elements[0],
            this.up.elements[1],
            this.up.elements[2]
        );
    }


    moveForward(){
        let f = new Vector3();

        f.set(this.at);
        f.sub(this.eye);
        f.normalize();
        f.mul(0.3);

        this.eye.add(f);
        this.at.add(f);

        this.updateView();
    }

    moveBackwards(){
        let b = new Vector3();

        b.set(this.eye)
        b.sub(this.at);
        b.normalize();
        b.mul(0.3);

        this.eye.add(b);
        this.at.add(b);

        this.updateView();
    }

    moveLeft(){
        let l = new Vector3();
        l.set(this.at);
        l.sub(this.eye);

        let p = Vector3.cross(this.up, l);
        p.normalize();
        p.mul(0.3);

        this.eye.add(p);
        this.at.add(p);

        this.updateView();

    }

    moveRight() {
        let r = new Vector3();
        r.set(this.at);
        r.sub(this.eye);

        let s = Vector3.cross(r, this.up);
        s.normalize();
        s.mul(0.3);

        this.eye.add(s);
        this.at.add(s);

        this.updateView();
    }

    pan(angle){
        let a = new Vector3();
        a.set(this.at);
        a.sub(this.eye);

        let rotationMatrix = new Matrix4();
        rotationMatrix.setRotate(
            angle,
            this.up.elements[0],
            this.up.elements[1],
            this.up.elements[2]
        );

        let fPrime = rotationMatrix.multiplyVector3(a);

        this.at.set(this.eye);
        this.at.add(fPrime);

        this.updateView();
    }

    panLeft(){
        this.pan(5);
    }

    panRight(){
        this.pan(-5);
    }
}