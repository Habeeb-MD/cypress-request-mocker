const requestMocker = require("../../index");
requestMocker();

describe("test mock date and record functionality", () => {
    it("[r]test recording", () => {
    cy.visit("index.html");
    cy.contains("Showing events for February-9").should("exist");
    cy.contains(
      "Zeno is crowned as co-emperor of the Byzantine Empire."
    ).should("exist");
    //wait 5 sec before startting another test
    cy.wait(5* 1000);
  });
});

describe("test stubbing functionality", () => {
    it("test stubbing", () => {
    cy.visit("index.html");
    cy.contains("Showing events for February-9").should("exist");
    cy.contains(
      "Zeno is crowned as co-emperor of the Byzantine Empire."
    ).should("exist");
  });
});
