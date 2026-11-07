food_to_ingredients = { 
    "Cake": ["Eggs", "Flour", "Sugar"], 
    "Salad": ["Lettuce", "Tomato", "Cucumber"] 
} 

add = { 
    "Sandwich": ["Bread", "Lettuce", "Tomato"], 
    "Onigiri": ["Seeweed", "Rice", "Meat"] 
} 

food_to_ingredients.update(add) 

for food, ingredients in food_to_ingredients.items(): 
    ingredients_list = ", ".join(ingredients)
    print(f"{food} needs {ingredients_list}")

