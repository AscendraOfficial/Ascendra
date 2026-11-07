import turtle 
import random 

colours = ["red", "orange", "yellow", "green", "blue", "cyan", "purple", "pink", "magenta", "LightGreen", "LightBlue"] 
sheldon = turtle.Turtle() 

while True: 
    colour = random.choice(colours) 
    steps = random.randrange(10, 70) 
    degrees = random.randrange(10, 350) 
    
    sheldon.color(colour)  
    sheldon.forward(steps) 
    sheldon.left(degrees)


