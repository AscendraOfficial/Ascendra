import random

names = ["Jayden", "Andre", "Victoria", "Amira", "Isaac", "Abby", "Gabriel", "Jenson", "Sophie", "Kyrie", "Brook", "Elijah", "David", "Joshua", "Moses"]
hired = []

group_size = int(input("How many people do you need for this job? "))

for i in range(group_size):
    if not names:
        print("No more available names left!")
        break
        
    employee = random.sample(names, 1)
    print(employee)
    hired.append(employee)

