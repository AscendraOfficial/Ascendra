import turtle as t

screen = t.Screen()
screen.tracer(False)
screen.title("Hangman Game")

pen = t.Turtle()
pen.speed(0)


def draw_pole():
    pen.penup()
    pen.goto(-200, -150)
    pen.pendown()

    pen.setheading(0)
    pen.forward(150)

    pen.backward(75)
    pen.setheading(90)
    pen.forward(300)

    pen.setheading(0)
    pen.forward(150)

    pen.setheading(270)
    pen.forward(40)


def draw_head():
    pen.penup()
    pen.goto(0, 60)
    pen.setheading(0)
    pen.pendown()
    pen.circle(30)


def draw_body():
    pen.penup()
    pen.goto(0, 60)
    pen.setheading(270)
    pen.pendown()
    pen.forward(100)


def draw_left_arm():
    pen.penup()
    pen.goto(0, 20)
    pen.setheading(220)
    pen.pendown()
    pen.forward(60)


def draw_right_arm():
    pen.penup()
    pen.goto(0, 20)
    pen.setheading(320)
    pen.pendown()
    pen.forward(60)


def draw_left_leg():
    pen.penup()
    pen.goto(0, -40)
    pen.setheading(220)
    pen.pendown()
    pen.forward(70)


def draw_right_leg():
    pen.penup()
    pen.goto(0, -40)
    pen.setheading(320)
    pen.pendown()
    pen.forward(70)


player1 = input("Player 1 name: ")
player2 = input("Player 2 name: ")

answer = input(f"{player1}, enter a word: ").lower()

print("\n" * 50)

guessed_letters = ""
wrong_letters = ""
lives = 6


while True:

    pen.clear()
    draw_pole()

    if lives <= 5:
        draw_head()

    if lives <= 4:
        draw_body()

    if lives <= 3:
        draw_left_arm()

    if lives <= 2:
        draw_right_arm()

    if lives <= 1:
        draw_left_leg()

    if lives <= 0:
        draw_right_leg()

    screen.update()


    word_finished = True

    for letter in answer:

        if letter in guessed_letters:
            print(letter, end=" ")

        else:
            print("_", end=" ")
            word_finished = False

    print()


    if word_finished:
        print(f"{player2} wins!")
        break


    if lives == 0:
        print(f"{player2} loses!")
        print("The word was:", answer)
        break


    guess = input("Guess a letter: ").lower()


    if guess in guessed_letters:
        print("You already guessed that!")

    elif guess in answer:
        guessed_letters += guess

    else:
        guessed_letters += guess
        wrong_letters += guess
        lives -= 1


    print("Wrong letters:", wrong_letters)
    print("Lives:", lives)


t.done()