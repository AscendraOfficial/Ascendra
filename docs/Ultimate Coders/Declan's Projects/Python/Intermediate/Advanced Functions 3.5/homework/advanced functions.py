import turtle
import random

draw_rectangle = turtle.Turtle()
draw_triangle = turtle.Turtle()
counterTurtle = turtle.Turtle()
screen = turtle.Screen()
screen.tracer(0)
counter = 0

draw_triangle.speed(0)

def draw_rectangle_func(length, width):
    for i in range(2):
        draw_rectangle.forward(length)
        draw_rectangle.left(90)
        draw_rectangle.forward(width)
        draw_rectangle.left(90)

def draw_colour_triangle(length, colour):
    draw_triangle.fillcolor(colour)
    draw_triangle.begin_fill()

    for i in range(3):
        draw_triangle.forward(length)
        draw_triangle.left(120)

    draw_triangle.end_fill()

def get_random_colour():
    colours = ["red", "crimson", "coral", "salmon", "hotpink", "purple", "deeppink", "orange", "darkorange", "gold", "yellow", "khaki", "green", "lightgreen", "forestgreen", "lime", "chartreuse", "seagreen", "blue", "skyblue", "deepskyblue", "cyan", "turquoise", "navy", "royalblue", "purple", "violet", "magenta", "orchid", "chocolate", "black"]

    return random.choice(colours)

# Draw 1000 triangles in a circle
for i in range(500):
    colour = get_random_colour()
    draw_colour_triangle(200, colour)
    draw_triangle.left(5)
    draw_triangle.forward(random.randint(0, 1))
    counter += 1
    counterTurtle.clear()
    counterTurtle.goto(0, screen.window_height() // 2 - 40)
    counterTurtle.write(
        f"Triangles drawn: {counter}",
        font=("Consolas", 18, "bold"),
    )
    screen.update()

turtle.done()