class_votes = ["Jen", "Jayden", "Jared", "Jen", "Jen", "Jayden", "Jayden", "Jen"]
names = ["Jen", "jayden", "jared"]
jen_count = 0
name_with_highest_votes = ""

for name in class_votes:
    if name == "Jen":
        jen_count += 1 

jayden_count = class_votes.count("Jayden")
jared_count = class_votes.count("Jared")
jen_count = class_votes.count("Jen")
counts = [jayden_count, jared_count, jen_count]
highest_vote = max(jayden_count, jared_count, jen_count)

if jayden_count > jared_count and jayden_count > jen_count:
    name_with_highest_votes = "Jayden"
elif jared_count > jayden_count and jayden_count > jen_count:
    name_with_highest_votes = "Jared"
elif jen_count > jayden_count and jen_count > jared_count:
    name_with_highest_votes = "Jen"

print(f"The highest vote is {name_with_highest_votes} with {highest_vote}")
