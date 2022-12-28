/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom/extend-expect'
$.fn.modal = jest.fn() 
import {screen, waitFor} from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import Bills from "../containers/Bills.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES_PATH} from "../constants/routes.js";
import { ROUTES } from "../constants/routes.js"
import {localStorageMock} from "../__mocks__/localStorage.js";
import store from "../__mocks__/store.js";
import router from "../app/Router.js";
import userEvent from "@testing-library/user-event";
import ErrorPage from "../views/ErrorPage.js";

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  window.localStorage.setItem('user', JSON.stringify({
    "type": "Employee",
    "email": "employee@test.tld",
    "status": "connected"
  }))
})

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      expect(windowIcon).toHaveClass("active-icon")
    })

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })

    test("Then clicking eye icon of the first bill image from first mocked bill should display modal", async () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      new Bills({ document, onNavigate, store, localStorage })
      const eyesIcons = screen.getAllByTestId("icon-eye")
      const firstEyesIcon = eyesIcons[0]
      userEvent.click(firstEyesIcon)
      const dialog = await screen.findByRole("dialog", {hidden:true})
      expect(dialog).toBeVisible()
    })

    test("Then displayed image should have same src as first data from mock", async () => {
      const screenPicture = await screen.findByTestId("billpicture")
      const firstStoreItem = await store.bills().list()
      const convertedFirstStoreItemUrl = new URL(firstStoreItem[0].fileUrl).href
      expect(screenPicture.src).toBe(convertedFirstStoreItemUrl)
    })

    test("Then clicking on newBill button should send to new bill page", async () => {
      const newBillBtn = screen.getByTestId("btn-new-bill")
      userEvent.click(newBillBtn)
      const pageTitle = await screen.findByText("Envoyer une note de frais")
      expect(pageTitle).toBeVisible()
    })
  })
})

describe("Given I instantiate Bills container with mocked store containing valid dates", () => {
  describe("When i am calling getBills method", () => {
    test("Then it should return mapped bills with formated date and status", async () => {
      const bills = new Bills({ document, onNavigate, store, localStorage })
      const formatedBills = await bills.getBills()
      expect(formatedBills[0].date).toBe("4 Avr. 04")
      expect(formatedBills[0].status).toBe("En attente")
  
      expect(formatedBills[1].date).toBe("1 Jan. 01")
      expect(formatedBills[1].status).toBe("Refused")
  
      expect(formatedBills[2].date).toBe("3 Mar. 03")
      expect(formatedBills[2].status).toBe("Accepté")
  
      expect(formatedBills[3].date).toBe("2 Fév. 02")
      expect(formatedBills[3].status).toBe("Refused")
    })
  })
})

describe("Given I instantiate Bills container with mocked store containing non formatable date", () => {
  describe("When i am calling getBills method", () => {
    test("Then it should return mapped bills with formated status and untouched date", async () => {
      const resolvedBillsListValueWithWrongDate = [{
        "id": "43225ddsf6fIm2zOKkLzMro",
        "status": "pending",
        "date": "wrong_date_example"
      }]

      jest.spyOn(store.bills(), "list").mockResolvedValueOnce(resolvedBillsListValueWithWrongDate)
  
      const bills = new Bills({ document, onNavigate, store, localStorage })
      const formatedBills = await bills.getBills()

      expect(store.bills().list).toBeCalled()
      expect(formatedBills[0].date).toBe("wrong_date_example")
      expect(formatedBills[0].status).toBe("En attente")
    })
  })
})

describe("Given I instantiate Bills container with undefined store", () => {
  describe("When i am calling getBills method", () => {
    test("Then it should return undefined and not throw error", async () => {
      const bills = new Bills({ document, onNavigate, undefined, localStorage })
      expect(bills.getBills).not.toThrowError()
      const formatedBills = await bills.getBills()
      expect(formatedBills).toBeUndefined()
    })
  })
})

describe("Given i'm on dashboard page", () => {
  describe("When server is failing to return bills", () => {
    let bills = null

    beforeEach(() => {
      bills = new Bills({ document, onNavigate, store, localStorage })
    })
  
    test("Then it should display the error page with 'Error 401'", async () => {
      const authErrorMockMessage = "Error 401 : user not allowed! you should clear your localstorage and retry!"
      jest.spyOn(bills, "getBills").mockImplementationOnce(() => {
        throw new Error(authErrorMockMessage)
      })

      expect(bills.getBills).toThrowError()

      try {
        await bills.getBills()
      } catch(error){
        expect(BillsUI({ error })).toMatchSnapshot(ErrorPage(error))
        document.body.innerHTML = BillsUI({ error })
        expect(screen.findByText(authErrorMockMessage)).toBeTruthy()
      }
    })

    test("Then it should display the error page with 'Error 404'", async () => {
      const authErrorMockMessage = "Error 404"
      jest.spyOn(bills, "getBills").mockImplementationOnce(() => {
        throw new Error(authErrorMockMessage)
      })

      expect(bills.getBills).toThrowError()

      try {
        await bills.getBills()
      } catch(error){
        expect(BillsUI({ error })).toMatchSnapshot(ErrorPage(error))
        document.body.innerHTML = BillsUI({ error })
        expect(screen.findByText(authErrorMockMessage)).toBeTruthy()
      }
    })

    test("Then it should display the error page with 'Error 500'", async () => {
      const authErrorMockMessage = "Error 500"
      jest.spyOn(bills, "getBills").mockImplementationOnce(() => {
        throw new Error(authErrorMockMessage)
      })

      expect(bills.getBills).toThrowError()

      try {
        await bills.getBills()
      } catch(error){
        expect(BillsUI({ error })).toMatchSnapshot(ErrorPage(error))
        document.body.innerHTML = BillsUI({ error })
        expect(screen.findByText(authErrorMockMessage)).toBeTruthy()
      }
    })
  })
})

