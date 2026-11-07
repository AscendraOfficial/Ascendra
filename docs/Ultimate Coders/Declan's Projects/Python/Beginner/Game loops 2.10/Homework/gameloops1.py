import turtle
import time
import random as r

screen = turtle.Screen()
screen.setup(width=1.0, height=1.0)
screen.listen()
screen.tracer(0)

blob = turtle.Turtle()
blob.shape("circle")
blob.color("green")
blob.penup()

# Constants
is_running = True
press_times = []

colours = [
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink",
    "black",
    "white",
    "gray",
    "brown",
    "cyan",
    "magenta",
    "sky blue",
    "light green",
    "dark green",
    "dark blue",
    "navy",
    "gold",
    "violet",
    "turquoise",
    "salmon",
    "lime"
]


# Functions
def end():
    global is_running
    is_running = False
    blob.write("Game Over! You spammed")


def check_spam():
    press_times.append(time.time())

    if len(press_times) >= 5:
        if press_times[-1] - press_times[-5] <= 0.9:
            blob.color("light blue")
            end()
            return True

    return False


def move_up():
    if check_spam():
        return

    blob.sety(blob.ycor() + 10)


def move_down():
    if check_spam():
        return

    blob.sety(blob.ycor() - 10)


def move_right():
    if check_spam():
        return

    blob.setx(blob.xcor() + 10)


def move_left():
    if check_spam():
        return

    blob.setx(blob.xcor() - 10)


def random_color():
    colour = r.choice(colours)
    blob.color(colour)


# LISTENING
screen.onkey(move_up, "w")
screen.onkey(move_left, "a")
screen.onkey(move_down, "s")
screen.onkey(move_right, "d")

screen.onkey(end, "q")
screen.onkey(random_color, "space")


# GAME LOOP
while is_running:
    screen.update()


turtle.done()