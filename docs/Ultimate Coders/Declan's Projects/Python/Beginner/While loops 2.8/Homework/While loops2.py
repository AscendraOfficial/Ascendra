import turtle
t = turtle.Turtle()
def draw_star():
    for i in range(5):
        t.forward(100)
        t.right(144)

while True:
    answer = input("Would you like turtle to draw a star? (yes/no) ").lower()
    if answer == "yes":
        draw_star()
    else:
        break

