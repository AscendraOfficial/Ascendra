import turtle 
colors = ["red", "blue", "green", "orange"]

# Set up the screen and turtle
screen = turtle.Screen()
t = turtle.Turtle()
t.pensize(5)
for i in range(4):
    t.color(colors[i])  
    t.forward(100)      
    t.right(90)         