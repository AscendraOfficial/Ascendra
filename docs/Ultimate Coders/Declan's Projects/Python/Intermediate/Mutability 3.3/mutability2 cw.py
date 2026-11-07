import turtle
import time

# Set up the screen and turtle
screen = turtle.Screen()
t = turtle.Turtle()

while True:
    angle = screen.numinput("Input Angle", "Enter an angle (1 - 365):", minval=1, maxval=365)
    
    if angle is None:
        print("Exiting game.")
        break
    
    t.right(angle)
    t.forward(100)
    time.sleep(0.5)
