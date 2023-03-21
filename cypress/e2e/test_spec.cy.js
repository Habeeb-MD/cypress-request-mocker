const requestMocker = require("../../index");

describe("test mock date and record functionality", () => {
  requestMocker();
  it("[r]test recording", () => {
    cy.visit("index.html");
    cy.contains("Showing events for February-9").should("exist");
    cy.contains(
      "Zeno is crowned as co-emperor of the Byzantine Empire."
    ).should("exist");
  });
});

describe("test stubbing functionality", () => {
  before(() => {
    //wait 3 sec before starting another test - wait for response in prev to get saved
    cy.wait(3 * 1000);
  });
  requestMocker();
  it("test stubbing", () => {
    cy.visit("index.html");
    cy.contains("Showing events for February-9").should("exist");
    cy.contains(
      "Zeno is crowned as co-emperor of the Byzantine Empire."
    ).should("exist");
  });
});
