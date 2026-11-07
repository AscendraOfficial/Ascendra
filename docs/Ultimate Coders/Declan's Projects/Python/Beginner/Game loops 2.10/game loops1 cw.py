import turtle
import random
import time

screen = turtle.Screen()
screen.tracer(0) # Turn off automatic drawing for better performance
screen.setup(width=1.0, height=1.0)

t = turtle.Turtle()
score = 0
is_running = True
speed = 3
levelup_xp = 0
levelup_req = 3
level = 1
ending_level = 5
t.color("green")

score_turtle = turtle.Turtle()
score_turtle.hideturtle()
score_turtle.penup()
score_turtle.goto(-240, 220)

over_turtle = turtle.Turtle()
over_turtle.hideturtle()
over_turtle.goto(0, 0)

border = turtle.Turtle()
border.hideturtle()
border.penup()
border.goto(-200, -200)
border.pendown()

win_turtle = turtle.Turtle()
win_turtle.hideturtle()
win_turtle.goto(0, 0)


for i in range(4):
    border.forward(400)
    border.left(90)

level_turtle = turtle.Turtle()
level_turtle.hideturtle()
level_turtle.penup()
level_turtle.goto(140, 220)

def draw_level():
    level_turtle.clear()
    level_turtle.write(
        f"Level: {level}",
        font=("Courier", 16, "bold")
    )

def draw_score():
    score_turtle.clear()
    score_turtle.write(
        f"Score: {score}",
        font=("Courier", 16, "bold")
    )

def hide():
    t.clear()
    t.hideturtle()
    t2.clear()
    score_turtle.clear()
    over_turtle.clear()

def finish_game():
    global is_running

    score_turtle.clear()
    score_turtle.write(
        f"CONGRATS\nYou finished the game!",
        align="center",
        font=("Courier", 27, "bold")
    )

    is_running = False

def game_over():
    global is_running

    hide()
    time.sleep(0.2)

    over_turtle.write(
        f"Game Over! Score: {score}",
        align="center",
        font=("Courier", 25, "bold")
    )

    is_running = False

def move_right():
    t.setheading(0)

def move_left():
    t.setheading(180)

def move_down():
    t.setheading(270)

def move_up():
    t.setheading(90)

screen.listen()
screen.onkey(move_up, "Up")
screen.onkey(move_down, "Down")
screen.onkey(move_left, "Left")
screen.onkey(move_right, "Right")

t2 = turtle.Turtle()
t2.hideturtle()

MAX_APPLES = 3
MAX_SPIKES = 2

apples = []
spikes = []

def random_pos():
    x = random.randrange(-180, 180, 20)
    y = random.randrange(-180, 180, 20)
    return x, y

def spawn_apple():
    if len(apples) < MAX_APPLES:
        x, y = random_pos()
        apples.append((x, y))

def draw_apples():
    for apple in apples:
        t2.penup()
        t2.goto(apple)
        t2.pendown()
        t2.dot(10, "red")

def spawn_spike():
    if len(spikes) < MAX_SPIKES:
        x, y = random_pos()

        while t.distance(x, y) < 60:
            x, y = random_pos()

        spikes.append((x, y))

def draw_spikes():
    for spike in spikes:
        t2.penup()
        t2.goto(spike)
        t2.pendown()
        t2.dot(20, "black")

draw_score()
draw_level()

while is_running:
    t2.clear()

    spawn_apple()
    draw_apples()

    spawn_spike()
    draw_spikes()

    for spike in spikes:
        if t.distance(spike) < 15:
            game_over()
            break

    for i in range(len(apples)):
        if t.distance(apples[i]) < 10:
            MAX_SPIKES += 1
            score += 1
            levelup_xp += 1

            if levelup_xp == levelup_req:
                levelup_xp = 0
                speed += 1
                levelup_req += 1
                level += 1
                draw_level()

            if level == ending_level:
                hide()
                finish_game()

            draw_score()
            apples.pop(i)
            break

    if (
        t.xcor() > 200
        or t.xcor() < -200
        or t.ycor() > 200
        or t.ycor() < -200
    ):
        game_over()

    t.forward(speed)

    time.sleep(0.02)

    screen.update()

turtle.done()