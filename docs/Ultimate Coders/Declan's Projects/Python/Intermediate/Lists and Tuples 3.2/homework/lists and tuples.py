import turtle

# Setup screen
screen = turtle.Screen()
screen.tracer(0)

turtles_list = [turtle.Turtle(), turtle.Turtle(), turtle.Turtle()]

colors = ["red", "green", "blue"]
for i, t in enumerate(turtles_list):
  t.color(colors[i % len(colors)])
  t.shape("turtle")
  t.penup()
  t.goto((i - 1) * 50, 0)  
  t.pendown()


while True:

  for t in turtles_list:
    t.circle(50)


  action = (
      input("Would you like to 'add' or 'remove' a turtle? (or 'quit'): ")
      .strip()
      .lower()
  )

  if action == "add":

    new_t = turtle.Turtle()
    new_t.shape("turtle")
    new_t.penup()
    new_t.goto(0, -50)
    new_t.pendown()
    turtles_list.append(new_t)
    print("A new turtle has been added.")

  elif action == "remove":

    if not turtles_list:
      print("There are no turtles left to remove.")
      continue

    while True:
      raw_input = input(
          f"Enter index to remove (0 to {len(turtles_list)-1}, or press Enter"
          " for last): "
      ).strip()


      if raw_input == "":
        removed = turtles_list.pop()
        removed.clear()
        removed.hideturtle()
        print("Removed the last turtle.")
        break

      try:
        idx = int(raw_input)

        if -len(turtles_list) <= idx < len(turtles_list):
          removed = turtles_list.pop(idx)
          removed.clear()
          removed.hideturtle()
          print(f"Removed turtle at index {idx}.")
          break
        else:
          print("Invalid index range. Please try again.")
      except ValueError:
        print("Invalid input. Please enter a valid integer number.")

  elif action == "quit":
    break
  screen.update()

screen.bye()
