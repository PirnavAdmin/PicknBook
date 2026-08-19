const fs = require('fs');
const path = 'C:\\Users\\Latitude\\Desktop\\Local\\frontend\\src\\pages\\booking\\FlightSearchResults.js';
let code = fs.readFileSync(path, 'utf8');

const insertPoint = '                sortedFlights.map((flight) => {';
const helperFunction = 
                    const handleConfirmFare = (optIdx, fallbackFareType) => {
                      let targetFlight = flight;
                      let chosenPrice = selectedFarePrice;
                      let chosenClass = flight.className || "Economy";
                    
                      if (Array.isArray(flight.fareOptions) && flight.fareOptions.length > 0) {
                        const actualOptIdx = optIdx !== undefined ? optIdx : (selectedFareOptionIndexByFlight[flight.id] ?? 0);
                        const chosenOpt = flight.fareOptions[actualOptIdx] || flight.fareOptions[0];
                        if (chosenOpt) {
                          targetFlight = {
                            ...flight,
                            resultIndex: chosenOpt.resultIndex,
                            srdvIndex: chosenOpt.srdvIndex,
                            isLcc: chosenOpt.isLcc,
                            isRefundable: chosenOpt.isRefundable,
                            fare: chosenOpt.offeredFare,
                            price: chosenOpt.offeredFare,
                            source: chosenOpt.source,
                          };
                          chosenPrice = chosenOpt.offeredFare;
                          chosenClass = \\\\\\ (\\\)\\\;
                        }
                      } else {
                        const actualFareType = fallbackFareType !== undefined ? fallbackFareType : (selectedFareTypeByFlight[flight.id] || "saver");
                        const baseFare = Number(flight.baseFarePrice || flight.fare || 0);
                        chosenPrice = actualFareType === "saver" ? baseFare :
                          actualFareType === "flexi" ? baseFare + 1500 :
                            baseFare + 3500;
                        chosenClass = actualFareType === "saver" ? "Economy (Saver)" :
                          actualFareType === "flexi" ? "Economy (Flexi Plus)" :
                            \\\\\\ UpFront\\\;
                      }
                    
                      if (tripType === "twoway") {
                        if (twoWayActiveTab === "onward") {
                          setSelectedOnwardFlightId(targetFlight.id);
                          setTwoWayActiveTab("return");
                          setExpandedFlightId(null);
                          setTimeout(() => {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }, 100);
                        } else {
                          setSelectedReturnFlightId(targetFlight.id);
                          setExpandedFlightId(null);
                        }
                      } else if (tripType === "multicity") {
                        const newSelections = { ...selectedMultiCityFlightIds, [multiCityActiveTab]: targetFlight.id };
                        setSelectedMultiCityFlightIds(newSelections);
                        if (multiCityActiveTab < apiFlights.length - 1) {
                          setMultiCityActiveTab(prev => prev + 1);
                          setExpandedFlightId(null);
                          setTimeout(() => {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }, 100);
                        } else {
                          setExpandedFlightId(null);
                        }
                      } else {
                        setExpandedFlightId(null);
                        handleStartBookingJourney(targetFlight, chosenPrice, chosenClass);
                      }
                    };
;

if (!code.includes('handleConfirmFare = (optIdx, fallbackFareType)')) {
  code = code.replace(insertPoint, insertPoint + helperFunction);
}

// 1. Dynamic Fare Card onClick
code = code.replace(
  /onClick=\{\(\) => \{\s*setSelectedFareOptionIndexByFlight\(prev => \(\{ \.\.\.prev, \[flight\.id\]: optIdx \}\)\);\s*if \(tripType === "twoway"\) \{[\s\S]*?\}\s*\}\}/g,
  \onClick={() => {
                                          setSelectedFareOptionIndexByFlight(prev => ({ ...prev, [flight.id]: optIdx }));
                                          handleConfirmFare(optIdx, undefined);
                                        }}\
);

// 2. Saver Fare Card onClick
code = code.replace(
  /onClick=\{\(\) => \{\s*setSelectedFareTypeByFlight\(prev => \(\{ \.\.\.prev, \[flight\.id\]: 'saver' \}\)\);\s*setSelectedFareType\('saver'\);\s*\}\}/g,
  \onClick={() => {
                                        setSelectedFareTypeByFlight(prev => ({ ...prev, [flight.id]: 'saver' }));
                                        setSelectedFareType('saver');
                                        handleConfirmFare(undefined, 'saver');
                                      }}\
);

// 3. Flexi Fare Card onClick
code = code.replace(
  /onClick=\{\(\) => \{\s*setSelectedFareTypeByFlight\(prev => \(\{ \.\.\.prev, \[flight\.id\]: 'flexi' \}\)\);\s*setSelectedFareType\('flexi'\);\s*\}\}/g,
  \onClick={() => {
                                        setSelectedFareTypeByFlight(prev => ({ ...prev, [flight.id]: 'flexi' }));
                                        setSelectedFareType('flexi');
                                        handleConfirmFare(undefined, 'flexi');
                                      }}\
);

// 4. Upfront Fare Card onClick
code = code.replace(
  /onClick=\{\(\) => \{\s*setSelectedFareTypeByFlight\(prev => \(\{ \.\.\.prev, \[flight\.id\]: 'upfront' \}\)\);\s*setSelectedFareType\('upfront'\);\s*\}\}/g,
  \onClick={() => {
                                        setSelectedFareTypeByFlight(prev => ({ ...prev, [flight.id]: 'upfront' }));
                                        setSelectedFareType('upfront');
                                        handleConfirmFare(undefined, 'upfront');
                                      }}\
);

// 5. Next Button onClick
code = code.replace(
  /onClick=\{\(\) => \{\s*let targetFlight = flight;[\s\S]*?handleStartBookingJourney\(targetFlight, chosenPrice, chosenClass\);\s*\}\s*\}\}/g,
  \onClick={() => handleConfirmFare()}\
);

fs.writeFileSync(path, code);
console.log("Done updating onClick handlers");
