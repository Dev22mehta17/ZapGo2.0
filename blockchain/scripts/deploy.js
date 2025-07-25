async function main() {
  const booking = await hre.ethers.deployContract("Booking");

  await booking.waitForDeployment();

  console.log(
    `Booking contract deployed to ${booking.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
 