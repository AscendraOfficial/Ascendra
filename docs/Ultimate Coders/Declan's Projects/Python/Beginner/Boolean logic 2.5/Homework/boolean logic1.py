import turtle
t = turtle.Turtle()
def draw_square():
    for i in range(4):
        t.forward(100)
        t.left(90)
try:
    answer = float(input("Enter your decimal number. "))
    if answer >= 10:
        draw_square
    else:
        print(False)
        
except ValueError:
    print("Please enter a decimal number. ")
