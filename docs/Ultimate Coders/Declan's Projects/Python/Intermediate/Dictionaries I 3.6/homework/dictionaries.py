Declan = {
    "phone number": "587 928 3839",
    "age": 10,
    "birthday": "2015/12/29",
    "gift ideas": ["New taekwondo gear"]
}

Jayden = {
    "phone number": "N/A",
    "age": "10",
    "birthday": "2016/9/N/A",
    "gift ideas": ["Ascendra getting 100 users"]
}

Bennett = {
    "phone number": "N/A",
    "age": 6,
    "birthday": "2020/8/6",
    "gift ideas": ["IDK"]
}

Isaac = {
    "phone number": "N/A",
    "age": 6,
    "birthday": "N/A",
    "gift ideas": ["IDK"]
}

name_to_info = {
    "Declan": Declan,
    "Jayden": Jayden,
    "Bennett": Bennett,
    "Isaac": Isaac,
}

i = name_to_info["Jayden"]["gift ideas"]
i.append("Ascendra getting 5 users")
name_to_info["Jayden"]["gift ideas"] = i

name_to_info["Declan"]["gift ideas"].append("NO SCHOOL")

print(name_to_info)
