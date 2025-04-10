/****************************************************************** */
// New Orders: ExpShip, FosdickWholesale, Hold TrueMed - SJ
/****************************************************************** */
/* 
query {
  order {
    createdAt
    updatedAt
    currentSubtotalLineItemsQuantity
  }
  shop {
    timezoneOffsetMinutes
    holidays {
      value
    }
    cutoffTime {
      value
    }
  }
}
*/
export default function main({ order, shop }) {
  // edit the holidays in the Shop Metafield furnacebrook.holidays
  // https://admin.shopify.com/store/weargales/apps/256-metafields-editor/shop
  const holidays = JSON.parse(shop.holidays.value); 
  const shopCutoffTime = shop.cutoffTime.value;
  //console.log("order: ", order)
  // console.log("holidays:", holidays, typeof holidays);
  console.log("shopCutoffTime:", shopCutoffTime);

  function checkDate(date, add = 0) {
    const dayAdj = [1, 0, 0, 0, 0, 0, 2][date.getUTCDay()];
    console.log("dayAdj: ", dayAdj);
    let shipDaily = dayAdj ? new Date(+date + dayAdj * 24 * 60 * 60 * 1000) : date;
    console.log("shipDaily: ", shipDaily.toUTCString());
    let shipDate = shipDaily.toISOString().split("T")[0];
    holidays.forEach(holiday => {
      if (holiday == shipDate) {
        shipDate = checkDate(new Date(+new Date(shipDate) + 24 * 60 * 60 * 1000));
      }
    })
    console.log("shipDate: ", shipDate);
    if (add > 0) {
      shipDate = checkDate(new Date(+new Date(shipDate) + 24 * 60 * 60 * 1000), add - 1);
    }
    return shipDate;
  }

  const created = new Date(order.createdAt); // This should be "updatedAt" for "Relase Held" flow
  const UtcOffset = shop.timezoneOffsetMinutes / 60;   
  // StoreTime (PST) to UTC: -480/60 = -8 
  // StoreTime (PDT) to UTC: -420/60 = -7
  // Order cutoff time is 6:45am ET = 3:45am PT = 3.75 PT
  // Standard cutoff = 24 + -8 - 3.75 = 12.25
  // Daylight Savings cutoff = 24 + -7 - 3.75 = 13.25
  const cutoffTime = 24 + UtcOffset - shopCutoffTime;
  console.log("created: ", created.toString());
  console.log("cutoffTime: ", cutoffTime);
  let shipDaily = new Date(+created + cutoffTime * 60 * 60 * 1000);
  console.log("shipDaily: ", shipDaily.toUTCString());
  const shipDate = checkDate(shipDaily, order.currentSubtotalLineItemsQuantity > 14 ? 2 : 0);
  console.log("shipDate: " + shipDate);
  return {
    shipDate: shipDate,
  };
}

/****************************************************************** */
// Canceled Order: Remove ExpShip & Deposco Checks - SJ
/****************************************************************** */
/*
query{
  shop {
    timezoneOffsetMinutes
    timezoneAbbreviation
    cutoffTime {
      value
    }
  }
  order {
    customAttributes {
      key
      value
    }
    displayFinancialStatus
    updatedAt
    createdAt
  }
}
*/

export default function main(input) {
  // console.log(input);
  function getPT(timeString) {
    const time =
      typeof timeString == "string" ? new Date(timeString) : timeString;
    return (
      new Date(
        time.valueOf() + input.shop.timezoneOffsetMinutes * 60 * 1000,
      ).toLocaleString() +
      " " +
      input.shop.timezoneAbbreviation
    );
  }
  const order = input?.fulfillmentOrder?.order || input?.order
  const updated = new Date(order.updatedAt);
  const cutoffUTC = -input.shop.timezoneOffsetMinutes/60 + 1 * input.shop.cutoffTime.value;
  let expShip, slaText;
  let updateDeposco = false;
  order.customAttributes.some((attr) => {
    if (attr.key == "SLA") {
      slaText = attr.value;
      expShip = new Date(slaText);
      expShip.setUTCHours(parseInt(cutoffUTC), cutoffUTC % 1 * 60);
      if (updated > expShip) updateDeposco = true;
      return true;
    }
  });
  // if (!expShip || expShip == "Invalid Date") updateDeposco = true;
  console.log("slaText", slaText);
  console.log("expShip", expShip);
  console.log("updated", updated, getPT(updated));
  console.log("created", order.createdAt, getPT(order.createdAt));
  console.log("updateDeposco", updateDeposco);
  return {
    updateDeposco: updateDeposco,
    slaText: slaText || "",
    expShip: expShip ? getPT(expShip) : "",
    updated: updated ? getPT(updated) : "",
    created: getPT(order.createdAt)
  };
}

/****************************************************************** */
// Edited Orders: Deposco Checks - SJ
/****************************************************************** */
/* 
query {
  shop {
    myshopifyDomain
    timezoneOffsetMinutes
    timezoneAbbreviation
  }
  scheduledAt
  getOrderData {
    name
    id
    legacyResourceId
    edited
    updatedAt
    createdAt
    customer {
      displayName
    }
    customAttributes {
      key
      value
    }
    events {
      createdAt
      message
    }
    lineItems {
      sku
      quantity
      currentQuantity
      variant {
        inventoryQuantity
      }
    }
  }
}
*/
export default function main(input) {
  const scheduledAt = new Date(new Date(input.scheduledAt).getTime() - 1 * 60 * 1000); // when the query ran, minus 1 min
  const lastTen = new Date(scheduledAt.getTime() - 11 * 60 * 1000); // ten minutes before
  const adminURL = "https://admin.shopify.com/store/" + input.shop.myshopifyDomain.split(".")[0];
  let notify = false;
  let message = "";
  const editedOrders = [];

  function getPT(timeString) {
    const time = typeof timeString == "string" ? new Date(timeString) : timeString;
    return (
      new Date(time.valueOf() + input.shop.timezoneOffsetMinutes * 60 * 1000,
      ).toLocaleString() +
      " " +
      input.shop.timezoneAbbreviation
    );
  }
  function createMessage(text) {
    console.log(text);
    message += "<div>" + text + "</div>\n";
  }
  input.getOrderData.forEach((order) => {
    if (order.edited) {
      let expShip, slaText, issueText;
      let updatedAfterExpShip = false;
      let orderEdited = false;
      let orderNotify = false;
      
      const updated = new Date(order.updatedAt);
      createMessage(
        "<a href='" + adminURL + "/orders/" + order.legacyResourceId + "'>" +
          order.name + "</a> edited",
      );
      createMessage("Order Created At: " + getPT(order.createdAt));
      createMessage("Order Updated At: " + getPT(updated));
  
      order?.customAttributes?.some((attr) => {
        if (attr.key == "SLA" && attr.value) {
          slaText = attr.value;
          expShip = new Date(slaText + "T10:45:00Z"); // 06:45am ET cutoff = 10:45am UTC
          if (updated > expShip) { // was order "edited" after SLA?
            updatedAfterExpShip = true; 
            createMessage("Order edited After ExpShip?");
          }
          return true;
        }
      });
      
      const SLA = slaText || "";
      createMessage("SLA: " + SLA);
      const orderEvents = [];
      const orderItems = [];
      // was it an edit that affected LineItems?
      // And Notify on 2 things: Item is backordered; Edited after ExpShip.
      order?.events?.forEach((event) => {
        console.log(event?.message);
        if ((event.message.includes("edited this order") || event.message.includes("Helpdesk"))
              && new Date(event.createdAt) >= lastTen) { // edited line item
          notify = true;
          orderEdited = true;
          orderNotify = updatedAfterExpShip;
          if (orderNotify) issueText = "Order edited After ExpShip. Check Deposco";
          orderEvents.push(getPT(event.createdAt) + ": " + event.message);
          createMessage(getPT(event.createdAt) + ": " + event.message);
          createMessage("orderNotify: " + orderNotify);
        }
      });
      if (orderEdited) { // list items and backorders
        order.lineItems.forEach((item) => {
          const itemText = item.sku + ": " + item.quantity + " &rArr; " + item.currentQuantity;
          let backorderText = "";
          if (item.variant.inventoryQuantity < 0 && item.currentQuantity > 0) {
            backorderText = "   ** BACKORDER: Only " + (item.currentQuantity 
              + item.variant.inventoryQuantity) + " available.";
            orderNotify = true;
            if (issueText) issueText = issueText + " / ";
            issueText = issueText + item.sku + " Backordered"
          }
          createMessage(itemText + backorderText);
          orderItems.push(itemText + backorderText)
        });
      }
      if (orderNotify) {
        editedOrders.push({name: order.name, legacyResourceId: order.legacyResourceId, 
          updatedAt: getPT(updated), issueText: issueText, SLA: SLA, expShip: getPT(expShip),
          events: orderEvents, items: orderItems, customer: order.customer.displayName
        });
      }
    }
  });
  console.log(message);
  console.log("notify: " + notify);

  // Make sure that the data you return matches the
  // shape & types defined in the output schema.
  return {
    notify: notify,
    message: message,
    scheduleTime: getPT(scheduledAt),
    editedOrders: editedOrders,
  };
}

/****************************************************************** */
// Hourly Orders SLA Check - SJ
/****************************************************************** */
/*
query{
  scheduledAt
  shop {
    timezoneOffsetMinutes
    holidays {
      value
    }
    cutoffTime {
      value
    }
  }
}
*/

export default function main(input) {
  // console.log(input);
  const now = new Date(input.scheduledAt);
  console.log("scheduledAt:"+now);
  const holidays = JSON.parse(input.shop.holidays.value);
  const date = input.scheduledAt.slice(0, 10);
  const weekday = now.getDay();
  const hour  = now.getHours();
  const startTime = -input.shop.timezoneOffsetMinutes/60 + 1 * input.shop.cutoffTime.value;
  const nextDay = new Date(now.valueOf() + (weekday > 4 ? 8 - weekday : 1)*24*60*60*1000).toISOString().slice(0,10)
    
  let enable = false;
  console.log("startTime: " + startTime)
  console.log("now: " + now.toString(), "weekday: "+weekday, "date: "+date, "hour: "+hour);
  console.log("nextDay: "+ nextDay);
  if (weekday > 0 && weekday < 6 && hour > startTime && hour < 23 && !holidays.includes(date)) {
    enable = true;
  }
  
  return {
    tag: `ExpShip__${date}`,
    nextDay: `ExpShip__${nextDay}`,
    enable: enable,
  };
}

/* INPUTS:
query{
  shop{
    unshippedorders {
      value
    }
  }
  getOrderData {
    id
    name
  }
  getOrderData1 {
    id
    name
  }
  getOrderData2 {
    id
    name
  }
}
*/
export default function main(input) {
  let unshipped = "unshipped: "
  input.getOrderData.forEach(o => {
    unshipped = unshipped + o.name + ": " + o.id + ",  "
  })
  input.getOrderData1.forEach(o => {
    unshipped = unshipped + o.name + ": " + o.id + ",  "
  })
  input.getOrderData2.forEach(o => {
    unshipped = unshipped + o.name + ": " + o.id + ",  "
  })

  console.log("metafield:", input.shop.unshippedorders.value)
  console.log("unshippedString:", unshipped);
  console.log("getOrderData", input.getOrderData)
  return {
    unshippedOrders: unshipped,
    updatedUnshipped: unshipped != input.shop.unshippedorders.value, 
  }
}



/****************************************************************** */
// Edited Orders: Deposco Checks - SJ
/****************************************************************** */
/*
query {
  shop {
    myshopifyDomain
    timezoneOffsetMinutes
    timezoneAbbreviation
    cutoffTime {
      value
    }
  }
  scheduledAt
  getOrderData {
    name
    id
    legacyResourceId
    edited
    updatedAt
    createdAt
    customer {
      displayName
    }
    customAttributes {
      key
      value
    }
    events {
      createdAt
      message
    }
    lineItems {
      sku
      quantity
      currentQuantity
      variant {
        inventoryQuantity
      }
    }
  }
}

*/
export default function main(input) {
  const scheduledAt = new Date(new Date(input.scheduledAt).getTime() - 1 * 60 * 1000); // when the query ran, minus 1 min
  const lastTen = new Date(scheduledAt.getTime() - 11 * 60 * 1000); // ten minutes before
  const adminURL = "https://admin.shopify.com/store/" + input.shop.myshopifyDomain.split(".")[0];
  let notify = false;
  let message = "";
  const editedOrders = [];

  function getPT(timeString) {
    const time = typeof timeString == "string" ? new Date(timeString) : timeString;
    return (
      new Date(time.valueOf() + input.shop.timezoneOffsetMinutes * 60 * 1000,
      ).toLocaleString() +
      " " +
      input.shop.timezoneAbbreviation
    );
  }
  function createMessage(text) {
    console.log(text);
    message += "<div>" + text + "</div>\n";
  }
  input.getOrderData.forEach((order) => {
    if (order.edited) {
      let expShip, slaText, issueText;
      let updatedAfterExpShip = false;
      let orderEdited = false;
      let orderNotify = false;
      
      const updated = new Date(order.updatedAt);
      const cutoffUTC = -input.shop.timezoneOffsetMinutes/60 + 1 * input.shop.cutoffTime.value;
      createMessage(
        "<a href='" + adminURL + "/orders/" + order.legacyResourceId + "'>" +
          order.name + "</a> edited",
      );
      createMessage("Order Created At: " + getPT(order.createdAt));
      createMessage("Order Updated At: " + getPT(updated));
  
      order?.customAttributes?.some((attr) => {
        if (attr.key == "SLA" && attr.value) {
          slaText = attr.value;
          expShip = new Date(slaText);
          expShip.setUTCHours(parseInt(cutoffUTC), cutoffUTC % 1 * 60);
          if (updated > expShip) { // was order "edited" after SLA?
            updatedAfterExpShip = true; 
            createMessage("Order edited After ExpShip?");
          }
          return true;
        }
      });
      
      const SLA = slaText || "";
      createMessage("SLA: " + SLA);
      const orderEvents = [];
      const orderItems = [];
      // was it an edit that affected LineItems?
      // And Notify on 2 things: Item is backordered; Edited after ExpShip.
      order?.events?.forEach((event) => {
        console.log(event?.message);
        if ((event.message.includes("edited this order") || event.message.includes("Helpdesk"))
              && new Date(event.createdAt) >= lastTen) { // edited line item
          notify = true;
          orderEdited = true;
          orderNotify = updatedAfterExpShip;
          if (orderNotify) issueText = "Order edited After ExpShip. Check Deposco";
          orderEvents.push(getPT(event.createdAt) + ": " + event.message);
          createMessage(getPT(event.createdAt) + ": " + event.message);
          createMessage("orderNotify: " + orderNotify);
        }
      });
      if (orderEdited) { // list items and backorders
        order.lineItems.forEach((item) => {
          const itemText = item.sku + ": " + item.quantity + " &rArr; " + item.currentQuantity;
          let backorderText = "";
          if (item.variant.inventoryQuantity < 0 && item.currentQuantity > 0) {
            backorderText = "   ** BACKORDER: Only " + (item.currentQuantity 
              + item.variant.inventoryQuantity) + " available.";
            orderNotify = true;
            if (issueText) issueText = issueText + " / ";
            issueText = issueText + item.sku + " Backordered"
          }
          createMessage(itemText + backorderText);
          orderItems.push(itemText + backorderText)
        });
      }
      if (orderNotify) {
        editedOrders.push({name: order.name, legacyResourceId: order.legacyResourceId, 
          updatedAt: getPT(updated), issueText: issueText, SLA: SLA, expShip: getPT(expShip),
          events: orderEvents, items: orderItems, customer: order.customer.displayName
        });
      }
    }
  });
  console.log(message);
  console.log("notify: " + notify);
  return {
    notify: notify,
    message: message,
    scheduleTime: getPT(scheduledAt),
    editedOrders: editedOrders,
  };
}
