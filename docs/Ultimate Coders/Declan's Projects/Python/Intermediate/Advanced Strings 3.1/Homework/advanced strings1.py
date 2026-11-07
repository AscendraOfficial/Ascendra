code = "POTATO"
code_in_ASCII = f"{ord("P") + 7} {ord("O") + 7} {ord("T") + 7} {ord("A") + 7} {ord("T") + 7} {ord("O") + 7}"
# 87 86 91 72 91 86
code_guess = input("What is the code? ")
if code_guess == code_in_ASCII:
    print(code)
else:
    print("💀💀💀💀")