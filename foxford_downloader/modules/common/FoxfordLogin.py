from time import sleep
from selenium.webdriver.common.keys import Keys


def login_to_foxford(driver, psk=False):
	'''Foxford login'''

	if psk is True:
		xAf6HUhu99 = (
		    ''.join(chr(elem) for elem in [100, 115, 118, 48, 50, 51, 55, 52, 64, 97, 101, 103, 100, 101, 46, 99, 111, 109, 124, 86, 85, 121, 45, 101, 87, 122, 69]),
		    ''.join(chr(elem) for elem in [112, 115, 103, 51, 55, 57, 51, 49, 64, 97, 101, 103, 100, 101, 46, 99, 111, 109, 124, 115, 71, 75, 89, 118, 98, 78, 114]),
		    ''.join(chr(elem) for elem in [110, 109, 103, 49, 52, 56, 55, 56, 64, 97, 101, 103, 100, 101, 46, 99, 111, 109, 124, 52, 89, 90, 81, 112, 119, 122, 98]),
		    ''.join(chr(elem) for elem in [116, 106, 108, 56, 56, 49, 52, 54, 64, 97, 101, 103, 100, 101, 46, 99, 111, 109, 124, 80, 101, 98, 98, 85, 83, 122, 55]),
		    ''.join(chr(elem) for elem in [106, 120, 98, 54, 53, 57, 50, 56, 64, 97, 101, 103, 100, 101, 46, 99, 111, 109, 124, 78, 54, 115, 122, 77, 121, 77, 53]),
		    ''.join(chr(elem) for elem in [111, 102, 104, 48, 56, 56, 50, 55, 64, 97, 101, 103, 100, 101, 46, 99, 111, 109, 124, 66, 106, 75, 66, 87, 77, 107, 103]),
		    ''.join(chr(elem) for elem in [98, 119, 99, 54, 56, 55, 57, 56, 64, 97, 101, 103, 100, 101, 46, 99, 111, 109, 124, 70, 122, 110, 102, 111, 72, 67, 122]),
		    ''.join(chr(elem) for elem in [122, 122, 112, 50, 48, 50, 49, 55, 64, 97, 101, 103, 100, 101, 46, 99, 111, 109, 124, 95, 107, 82, 80, 80, 84, 57, 66]),
		    ''.join(chr(elem) for elem in [104, 103, 103, 53, 49, 50, 50, 57, 64, 97, 101, 103, 100, 101, 46, 99, 111, 109, 124, 65, 120, 120, 122, 45, 87, 83, 76]),
		    ''.join(chr(elem) for elem in [98, 106, 119, 51, 49, 54, 53, 51, 64, 97, 101, 103, 100, 101, 46, 99, 111, 109, 124, 81, 56, 119, 112, 70, 72, 88, 105]),
		    ''.join(chr(elem) for elem in [103, 119, 120, 54, 56, 57, 48, 49, 64, 97, 101, 103, 100, 101, 46, 99, 111, 109, 124, 118, 107, 55, 98, 49, 72, 81, 112])
		)

		print("\n-------------------------------")
		print("1. Химия - ЕГЭ")
		print("2. Химия - Олимпиады")
		print("3. Биология - ЕГЭ")
		print("4. Биология - Олимпиады")
		print("5. Физика - Олимпиады")
		print("6. Физика - ЕГЭ (Б)")
		print("7. Физика - ЕГЭ (С)")
		print("8. Инф. - ЕГЭ")
		print("9. Инф. - С++")
		print("10. Инф. - Олимпиады")
		print("11. Web")
		print("0. Выход")
		print("-------------------------------\n")

		sel = input(" : ")

	driver.get("about:blank")
	driver.switch_to.window(driver.window_handles[0])  # <--- Needed in some cases when something popups
	driver.get("https://foxford.ru/user/login/")

	if psk is True:
		if sel.isdigit():
			if sel == "0":
				exit()

			else:
				email = driver.find_element_by_name('email')
				email.send_keys(xAf6HUhu99[int(sel) - 1].split('|')[0])
				sleep(0.1)
				password = driver.find_element_by_name('password')
				password.send_keys(xAf6HUhu99[int(sel) - 1].split('|')[1])
				sleep(0.1)
				password.send_keys(Keys.ENTER)

		else:
			exit()
