// Select implementation: if you select data when it doesn't exist, a promise will
// be thrown unless the fetch strategy has given up, at which point an error
// will be thrown. Data will never exist in forbidden/empty/error states.
//
// This won't return until status/dtaa has a value; if you want to give a
// default value to prevent suspense, wrap the result with the defaultValue
// function.

export function createResourceModel<Value, Job, Context extends object>(
  key: string,
  options: Omit<ResourceOptions<Value, Job, Context>, 'context' | 'store'>,
) {
  // Map context keys to resources that handle their data. The instances will
  // add themselves when they have any subscriptions or data, and remove
  // themselves once they no longer have any subscriptions, and have purged all
  // data. This way, instances can be garbage collected once they're no longer
  // in use, while being held around for the future if there is still a
  // possibility that they'll be used again.
  const contextKeyInstanceRegister = {} as {
    [contextKey: string]: Resource<Data, Key, Context extends object>
  }

  return createModel((context: Context) => {
    // - if the returned instance and context are both no longer accessible,
    //   then we still want the data to hang around until it is no longer needed.
    // - the issue is, how do you know if ther returned instance/context are no
    //   longer accessible?
    // - it's possible that there'll be no subscriptions and no data while we
    //   still have a reference to the instance outside this function. we don't
    //   want to remove the instance from the map in that case, as there's
    //   still a relatively high chance that we'll get another subscription.
    // - could subscribe to whether the instance has data/subscriptions or not,
    //   but there's a chance that this would prevent garbage collection of the
    //   instance -- i'm not sure.
    // - probably a cleaner way would be for the instance to add a reference to
    //   itself to the model itself while it has data/subscriptions, and remove
    //   it while it doesn't. this *should* allow the instance to be garbage
    //   collected when it holds no data, while allowing it to be found and
    //   re-used while it does.

    return createResource({
      ...options,
      context,
      storeAt: [context.store, key],
    })
  })
}
