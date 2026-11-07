def count_items(input_dict):
    count = 0
    for item_list in input_dict.values():
        for i in item_list:
            count += 1
    return count

thingymajigy = { 
    "thing1": ["thingy11", "thingy12", "thingy 13"],
    "thing2": ["thingy11", "thingy12", "thingy 13"],
    "thing3": ["thingy11", "thingy12", "thingy 13"],
    "thing4": ["thingy11", "thingy12", "thingy 13"] 
}

print(count_items(thingymajigy))

