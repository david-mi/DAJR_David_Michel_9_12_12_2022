/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom/extend-expect'
import { fireEvent, getByTestId, screen, wait, waitFor } from "@testing-library/dom"
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import store from "../__mocks__/store.js"
import userEvent from "@testing-library/user-event";
import { localStorageMock } from "../__mocks__/localStorage.js"
import { ROUTES } from "../constants/routes.js"

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    beforeAll(() => {
      const html = NewBillUI()
      document.body.innerHTML = html
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      new NewBill({ document, onNavigate, store, localStorageMock })
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.clear()
      window.localStorage.setItem("user", JSON.stringify({
        email: "employee@test.tld"
      }))
    })

    test("Then it should write 'Nouvelle facture' in name input", async () => {
      const expenseInput = screen.getByTestId("expense-name")
      await userEvent.type(expenseInput, "Nouvelle facture")
      expect(expenseInput).toHaveValue("Nouvelle facture")
    })

    test("Then it should select 'Services en Ligne' from select menu", () => {
      const selectMenu = screen.getByTestId("expense-type")
      userEvent.click(selectMenu)
      const serviceOption = screen.getByText("Services en ligne")
      userEvent.click(serviceOption)
    })

    test("Then it should set bill date to '2020-12-15'", async () => {
      const dateInput = screen.getByTestId("datepicker")
      dateInput.value = "2020-12-15"
      expect(dateInput.value).toBe("2020-12-15")
      expect(dateInput).toBeValid()
    })

    test("Then it should set price amount to '300'", async () => {
      const priceInput = screen.getByTestId("amount")
      await userEvent.type(priceInput, "300")
      expect(priceInput.value).toBe("300")
      expect(priceInput).toBeValid()
    })

    test("Then it should set vat to '20'", async () =>  {
      const tvaInput = screen.getByTestId("vat")
      await userEvent.type(tvaInput, "20")
      expect(tvaInput.value).toBe("20")
      expect(tvaInput).toBeValid()
    })

    test("Then it should set pct to '5'", async () => {
      const pctInput = screen.getByTestId("pct")
      await userEvent.type(pctInput, "5")
      expect(pctInput.value).toBe("5")
      expect(pctInput).toBeValid()
    })

    test("Then it should add 'commentary' to commentary textarea", async () => {
      const commentaryTextArea = screen.getByTestId("commentary")
      await userEvent.type(commentaryTextArea ,"this is a comment")
      expect(commentaryTextArea.value).toBe("this is a comment")
      expect(commentaryTextArea).toBeValid()
    })

    test("Then it should upload gif file to file input", () => {
      const fileInput = screen.getByTestId("file")
      const fakeGifFile = new File(['randomGif'], 'test.gif', {type: 'image/gif'})
      userEvent.upload(fileInput, fakeGifFile);
      expect(fileInput.files[0]).toBe(fakeGifFile)
    })

    test("Then form should be invalid", () => {
      const form = screen.getByTestId("form-new-bill")
      expect(form).toBeInvalid()
    })

    test("Then it should not send user back to bills page when clicking on submit button", () => {
      const submitButton = screen.getByText("Envoyer")
      userEvent.click(submitButton)
      expect(screen.getByText("Envoyer une note de frais")).toBeTruthy()
    })

    test("Then it should upload png file to file input",  () => {
      const fakePngFile = new File(['test'], 'test.jpg', {type: "image/jpg"})
      const fileInput = screen.getByTestId("file")
      userEvent.upload(fileInput, fakePngFile)
      expect(fileInput.files[0]).toBe(fakePngFile)
    })

    test("Then it should submit form and user send back to bill page", () => {
      const submitButton = screen.getByText("Envoyer")
      userEvent.click(submitButton)
      screen.getByTestId("btn-new-bill")
    })  
  })
})
