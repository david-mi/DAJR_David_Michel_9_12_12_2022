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
import mockStore from "../__mocks__/store.js";
import router from "../app/Router.js";
import userEvent from "@testing-library/user-event";
import ErrorPage from "../views/ErrorPage.js";

jest.mock("../app/store", () => mockStore)

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
      new Bills({ document, onNavigate, store: mockStore, localStorage })
      const eyesIcons = screen.getAllByTestId("icon-eye")
      const firstEyesIcon = eyesIcons[0]
      userEvent.click(firstEyesIcon)
      const dialog = await screen.findByRole("dialog", {hidden:true})
      expect(dialog).toBeVisible()
    })

    test("Then displayed image should have same src as first data from mock", async () => {
      const screenPicture = await screen.findByTestId("billpicture")
      const firstStoreItem = await mockStore.bills().list()
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
      const bills = new Bills({ document, onNavigate, store: mockStore, localStorage })
      const formatedBills = await bills.getBills()
      expect(formatedBills[0].formatedDate).toBe("4 Avr. 04")
      expect(formatedBills[0].status).toBe("En attente")
  
      expect(formatedBills[1].formatedDate).toBe("1 Jan. 01")
      expect(formatedBills[1].status).toBe("Refused")
  
      expect(formatedBills[2].formatedDate).toBe("3 Mar. 03")
      expect(formatedBills[2].status).toBe("Accepté")
  
      expect(formatedBills[3].formatedDate).toBe("2 Fév. 02")
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

      jest.spyOn(mockStore.bills(), "list").mockResolvedValueOnce(resolvedBillsListValueWithWrongDate)
  
      const bills = new Bills({ document, onNavigate, store: mockStore, localStorage })
      const formatedBills = await bills.getBills()

      expect(mockStore.bills().list).toBeCalled()
      expect(formatedBills[0].date).toBe("wrong_date_example")
      expect(formatedBills[0].status).toBe("En attente")
    })
  })
})

describe("Given I am connected on Bills page as an Employee", () => {
  describe("When bills are trying to be fetched from Api", () => {  
    beforeAll(() => {
      jest.spyOn(mockStore.bills(), "list")
    })

    beforeEach(() => {
      localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }));
      const root = '<div id="root"></div>'
      document.body.innerHTML = root
      router()
    })

    test("Then bills data should be returned and displayed", async () => {
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => {
        expect(mockStore.bills().list).toHaveBeenCalled()
        expect(document.querySelectorAll("tbody tr").length).toBe(4)

        expect(screen.getByText("encore")).toBeTruthy()
        expect(screen.getByText("test1")).toBeTruthy()
        expect(screen.getByText("test2")).toBeTruthy()
        expect(screen.getByText("test3")).toBeTruthy()
      })
    })
  
    test("Then fetch should fail with a 500 message error displayed to the DOM", async () => {
      const authErrorMock = new Error("Erreur 500")
      jest.spyOn(mockStore.bills(), "list").mockRejectedValueOnce(authErrorMock)
  
      window.onNavigate(ROUTES_PATH.Bills)
  
      await waitFor(() => {
        expect(screen.getByText(/Erreur 500/)).toBeTruthy()
        expect(document.body).toMatchSnapshot(ErrorPage(authErrorMock))
      })
    })
  
    test("Then fetch should fail with a 401 message error displayed to the DOM", async () => {
      const authErrorMock = new Error("Erreur 401")
      jest.spyOn(mockStore.bills(), "list").mockRejectedValueOnce(authErrorMock)
  
      window.onNavigate(ROUTES_PATH.Bills)
  
      await waitFor(() => {
        expect(screen.getByText(/Erreur 401/)).toBeTruthy()
        expect(document.body).toMatchSnapshot(ErrorPage(authErrorMock))
      })
    })
  
    test("Then fetch should fail with a 400 message error displayed to the DOM", async () => {
      const authErrorMock = new Error("Erreur 400")
      jest.spyOn(mockStore.bills(), "list").mockRejectedValueOnce(authErrorMock)
  
      window.onNavigate(ROUTES_PATH.Bills)
  
      await waitFor(() => {
        expect(screen.getByText(/Erreur 400/)).toBeTruthy()
        expect(document.body).toMatchSnapshot(ErrorPage(authErrorMock))
      })
    })
  })
})

